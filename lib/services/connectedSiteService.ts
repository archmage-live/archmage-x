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

    const origin = new URL(href).origin

    if (!iconUrl) {
      const tab = await getTab({ origin })
      if (tab) {
        iconUrl = tab.favIconUrl
      }
    }

    const conns: IConnectedSite[] = []
    for (const account of accounts) {
      const existing = await this.getConnectedSite(account, href, false)
      if (existing) {
        existing.iconUrl = iconUrl || existing.iconUrl
        existing.connected = booleanToNumber(true)
        existing.info.connectedAt = Date.now()
        conns.push(existing)
      } else {
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
        conns.push(add)
      }
    }

    const ids = await DB.connectedSites.bulkPut(conns, { allKeys: true })
    ids.forEach((id, index) => {
      if (conns[index].id === undefined) {
        conns[index].id = id
      } else {
        assert(conns[index].id === id)
      }
    })

    return conns
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
    connected = true
  ): Promise<IConnectedSite[]> {
    const origin = new URL(href).origin
    return DB.connectedSites
      .where('[origin+connected]')
      .equals([origin, booleanToNumber(connected)] as Array<any>)
      .toArray()
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
