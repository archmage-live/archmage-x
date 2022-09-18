import assert from 'assert'
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { useAsync } from 'react-use'

import { getActive, useActiveAccount } from '~lib/active'
import { DB } from '~lib/db'
import { ENV } from '~lib/env'
import { SERVICE_WORKER_CLIENT, SERVICE_WORKER_SERVER } from '~lib/rpc'
import {
  IChainAccount,
  INetwork,
  booleanToNumber,
  mapBySubIndex
} from '~lib/schema'
import { IConnectedSite } from '~lib/schema/connectedSite'
import { WALLET_SERVICE, useChainAccounts } from '~lib/services/walletService'
import { getCurrentTab, getTab } from '~lib/util'

interface IConnectedSiteService {
  connectSite(
    accounts: IChainAccount,
    href: string,
    iconUrl?: string
  ): Promise<IConnectedSite>

  connectSiteWithReplace(
    accounts: IChainAccount[],
    href: string,
    iconUrl?: string,
    connected?: boolean
  ): Promise<IConnectedSite[]>

  getConnectedSite(
    account: IChainAccount,
    href: string,
    connected?: boolean
  ): Promise<IConnectedSite | undefined>

  getConnectedSitesByAccount(
    account: IChainAccount,
    connected?: boolean
  ): Promise<IConnectedSite[]>

  getConnectedSitesBySite(
    href: string,
    connected?: boolean
  ): Promise<IConnectedSite[]>

  disconnectSite(
    query: number | { account: IChainAccount; href: string }
  ): Promise<void>

  disconnectSitesByAccount(account: IChainAccount): Promise<void>

  disconnectSitesBySite(href: string): Promise<void>
}

// @ts-ignore
class ConnectedSiteServicePartial implements IConnectedSiteService {
  async getConnectedSite(
    account: IChainAccount,
    href: string,
    connected = true
  ): Promise<IConnectedSite | undefined> {
    const origin = new URL(href).origin
    return DB.connectedSites
      .where('[masterId+index+origin+connected]')
      .equals([
        account.masterId,
        account.index,
        origin,
        booleanToNumber(connected)
      ] as Array<any>)
      .first()
  }

  async getConnectedSitesByAccount(
    account: IChainAccount,
    connected = true
  ): Promise<IConnectedSite[]> {
    return DB.connectedSites
      .where('[masterId+index+connected]')
      .equals([
        account.masterId,
        account.index,
        booleanToNumber(connected)
      ] as Array<any>)
      .toArray()
  }

  async getConnectedSitesBySite(
    href: string,
    connected: boolean | undefined = true
  ): Promise<IConnectedSite[]> {
    const origin = new URL(href).origin
    if (typeof connected === 'boolean') {
      return DB.connectedSites
        .where('[origin+connected]')
        .equals([origin, booleanToNumber(connected)])
        .toArray()
    } else {
      return DB.connectedSites.where('origin').equals(origin).toArray()
    }
  }
}

class ConnectedSiteService extends ConnectedSiteServicePartial {
  async connectSite(
    account: IChainAccount,
    href: string,
    iconUrl?: string
  ): Promise<IConnectedSite> {
    const origin = new URL(href).origin

    if (!iconUrl) {
      const tab = await getTab({ origin })
      if (tab) {
        iconUrl = tab.favIconUrl
      }
    }

    const conn = {
      masterId: account.masterId,
      index: account.index,
      origin,
      iconUrl,
      connected: booleanToNumber(true),
      info: {
        connectedAt: Date.now()
      }
    } as IConnectedSite

    conn.id = await DB.connectedSites.add(conn)

    return conn
  }

  async connectSiteWithReplace(
    accounts: IChainAccount[],
    href: string,
    iconUrl?: string
  ): Promise<IConnectedSite[]> {
    assert(accounts.length)
    const accountsMap = new Map(
      accounts.map((acc) => [`${acc.masterId}-${acc.index}`, acc])
    )

    const origin = new URL(href).origin

    if (!iconUrl) {
      const tab = await getTab({ origin })
      if (tab) {
        iconUrl = tab.favIconUrl
      }
    }

    const bulkPut: IConnectedSite[] = []
    const bulkDelete: number[] = []

    const existings = await this.getConnectedSitesBySite(href, undefined)
    const existingMap = new Map(
      existings.map((existing) => [
        `${existing.masterId}-${existing.index}`,
        existing
      ])
    )

    for (const existing of existings) {
      const acc = accountsMap.get(`${existing.masterId}-${existing.index}`)
      if (!acc) {
        bulkDelete.push(existing.id)
      } else {
        existing.iconUrl = iconUrl || existing.iconUrl
        existing.connected = booleanToNumber(true)
        existing.info.connectedAt = Date.now()
        bulkPut.push(existing)
      }
    }

    for (const account of accounts) {
      if (!existingMap.has(`${account.masterId}-${account.index}`)) {
        const add = {
          masterId: account.masterId,
          index: account.index,
          origin,
          iconUrl,
          connected: booleanToNumber(true),
          info: {
            connectedAt: Date.now()
          }
        } as IConnectedSite
        bulkPut.push(add)
      }
    }

    await DB.transaction('rw', [DB.connectedSites], async () => {
      await DB.connectedSites.bulkDelete(bulkDelete)

      const ids = await DB.connectedSites.bulkPut(bulkPut, { allKeys: true })
      ids.forEach((id, index) => {
        if (bulkPut[index].id === undefined) {
          bulkPut[index].id = id
        } else {
          assert(bulkPut[index].id === id)
        }
      })
    })

    return bulkPut
  }

  async disconnectSite(
    query: number | { account: IChainAccount; href: string }
  ) {
    if (typeof query === 'number') {
      await DB.connectedSites.update(query, { connected: false })
    } else {
      const { account, href } = query
      const conn = await this.getConnectedSite(account, href)
      if (!conn) {
        return
      }
      await DB.connectedSites.update(conn.id, { connected: false })
    }
  }

  async disconnectSitesByAccount(account: IChainAccount) {
    await DB.connectedSites
      .where('[masterId+index+connected]')
      .equals([
        account.masterId,
        account.index,
        booleanToNumber(true)
      ] as Array<any>)
      .modify({ connected: false })
  }

  async disconnectSitesBySite(href: string) {
    const origin = new URL(href).origin
    await DB.connectedSites
      .where('[origin+connected]')
      .equals([origin, booleanToNumber(true)] as Array<any>)
      .modify({ connected: false })
  }
}

function createConnectedSiteService() {
  const serviceName = 'connectedSiteService'
  if (ENV.inServiceWorker) {
    const service = new ConnectedSiteService()
    SERVICE_WORKER_SERVER.registerService(serviceName, service)
    return service
  } else {
    return SERVICE_WORKER_CLIENT.service<IConnectedSiteService>(
      serviceName,
      // @ts-ignore
      new ConnectedSiteServicePartial()
    )
  }
}

export const CONNECTED_SITE_SERVICE = createConnectedSiteService()

export function useConnectedSiteAccess(account?: IChainAccount, href?: string) {
  const conn = useConnectedSite(account, href)

  useAsync(async () => {
    if (!conn) {
      return
    }
    const accessedAt = conn.info.accessedAt
    if (typeof accessedAt === 'number' && Date.now() - accessedAt <= 1000) {
      return
    }

    await DB.connectedSites.update(conn.id, {
      info: {
        ...conn.info,
        accessedAt: Date.now()
      }
    })
  }, [conn])

  return conn
}

export function useConnectedSite(account?: IChainAccount, href?: string) {
  return useLiveQuery(async () => {
    if (!account) {
      return
    }
    if (!href) {
      href = (await Promise.resolve(getCurrentTab()))?.url
    }
    if (!href) {
      return
    }
    const conn = await CONNECTED_SITE_SERVICE.getConnectedSite(account, href)
    return conn || null
  }, [account, href])
}

export function useConnectedSitesBySite(href?: string) {
  return useLiveQuery(async () => {
    if (!href) {
      href = (await Promise.resolve(getCurrentTab()))?.url
    }
    if (!href) {
      return undefined
    }
    return CONNECTED_SITE_SERVICE.getConnectedSitesBySite(href)
  }, [href])
}

export function useConnectedSitesByAccount(account: IChainAccount) {
  return useLiveQuery(async () => {
    return CONNECTED_SITE_SERVICE.getConnectedSitesByAccount(account)
  }, [account])
}

export function useConnectedAccountsBySite(href?: string, network?: INetwork) {
  const conns = useConnectedSitesBySite(href)

  const query = useMemo(() => {
    if (!network || !conns) {
      return
    }
    return {
      networkKind: network.kind,
      chainId: network.chainId,
      subIndices: conns.map(({ masterId, index }) => ({ masterId, index }))
    }
  }, [network, conns])

  const accounts = useChainAccounts(query)

  const activeAccount = useActiveAccount()

  const account = useMemo(() => {
    if (!conns || !accounts) {
      return
    }
    const activeIndex = findActiveFromConnectedAccounts(
      conns,
      accounts,
      activeAccount
    )
    if (activeIndex < 0) {
      return
    }
    return accounts[activeIndex]
  }, [accounts, activeAccount, conns])

  return {
    accounts,
    activeAccount: account
  }
}

export async function getConnectedAccountsBySite(
  href: string,
  network: INetwork
) {
  // get connections by site
  const conns = await CONNECTED_SITE_SERVICE.getConnectedSitesBySite(href)
  if (!conns.length) {
    return []
  }

  // get connected accounts
  let accounts = await WALLET_SERVICE.getChainAccounts({
    networkKind: network.kind,
    chainId: network.chainId,
    subIndices: conns.map(({ masterId, index }) => ({ masterId, index }))
  })

  assert(conns.length === accounts.length)

  // filter accounts with valid address
  accounts = accounts.filter((account) => !!account.address)
  if (!accounts.length) {
    return []
  }

  const { account: activeAccount } = await getActive()

  const activeIndex = findActiveFromConnectedAccounts(
    conns,
    accounts,
    activeAccount
  )

  assert(activeIndex > -1)
  if (activeIndex > 0) {
    // put active account at the front of the array
    const [active] = accounts.splice(activeIndex, 1)
    accounts.unshift(active)
  }

  return accounts
}

function findActiveFromConnectedAccounts(
  conns: IConnectedSite[],
  accounts: IChainAccount[],
  activeAccount?: IChainAccount
) {
  const connMap = mapBySubIndex(conns)

  let index = -1
  let maxAccessedAt = -1
  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i]

    if (!account.address) {
      continue
    }

    if (account.id === activeAccount?.id) {
      // prefer active account
      index = i
      break
    }

    const accessedAt = connMap.get(account.masterId)?.get(account.index)
      ?.info.accessedAt

    if ((accessedAt || 0) > maxAccessedAt) {
      // secondly to most recently accessed
      maxAccessedAt = accessedAt
      index = i
    }
  }

  return index
}
