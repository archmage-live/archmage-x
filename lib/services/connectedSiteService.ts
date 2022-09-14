import assert from 'assert'
import { useLiveQuery } from 'dexie-react-hooks'

import { DB } from '~lib/db'
import { ENV } from '~lib/env'
import { SERVICE_WORKER_CLIENT, SERVICE_WORKER_SERVER } from '~lib/rpc'
import { IChainAccount, booleanToNumber } from '~lib/schema'
import { IConnectedSite } from '~lib/schema/connectedSite'
import { getCurrentTab, getTab } from '~lib/util'

interface IConnectedSiteService {
  connectSite(
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

  disconnectSite(id: number): Promise<void>

  disconnectSitesByWallet(account: IChainAccount): Promise<void>

  disconnectSitesBySite(href: string): Promise<void>
}

class ConnectedSiteService implements IConnectedSiteService {
  async connectSite(
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

  async disconnectSite(id: number) {
    await DB.connectedSites.update(id, { connected: false })
  }

  async disconnectSitesByWallet(account: IChainAccount) {
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
    return SERVICE_WORKER_CLIENT.service<IConnectedSiteService>(serviceName)
  }
}

export const CONNECTED_SITE_SERVICE = createConnectedSiteService()

export function useConnectedSitesBySite(href?: string) {
  return useLiveQuery(async () => {
    if (!href) {
      href = (await getCurrentTab())?.url
    }
    if (!href) {
      return undefined
    }
    return CONNECTED_SITE_SERVICE.getConnectedSitesBySite(href)
  }, [href])
}

export function useConnectedSitesByWallet(account: IChainAccount) {
  return useLiveQuery(async () => {
    return CONNECTED_SITE_SERVICE.getConnectedSitesByAccount(account)
  }, [account])
}
