import assert from 'assert'
import browser from 'webextension-polyfill'

import { DB } from '~lib/db'
import { ENV } from '~lib/env'
import { SERVICE_WORKER_CLIENT, SERVICE_WORKER_SERVER } from '~lib/rpc'
import { IWalletInfo, booleanToNumber } from '~lib/schema'
import { IConnectedSite } from '~lib/schema/connectedSite'

interface IConnectedSiteService {
  connectSite(
    wallet: IWalletInfo[],
    href: string,
    iconUrl?: string,
    connected?: boolean
  ): Promise<IConnectedSite[]>

  getConnectedSite(
    wallet: IWalletInfo,
    href: string,
    connected?: boolean
  ): Promise<IConnectedSite | undefined>

  getConnectedSitesByWallet(
    wallet: IWalletInfo,
    connected?: boolean
  ): Promise<IConnectedSite[]>

  getConnectedSitesBySite(
    href: string,
    connected?: boolean
  ): Promise<IConnectedSite[]>

  disconnectSite(id: number): Promise<void>

  disconnectSitesByWallet(wallet: IWalletInfo): Promise<void>

  disconnectSitesBySite(href: string): Promise<void>
}

class ConnectedSiteService implements IConnectedSiteService {
  async connectSite(
    wallets: IWalletInfo[],
    href: string,
    iconUrl?: string
  ): Promise<IConnectedSite[]> {
    assert(wallets.length)

    const origin = new URL(href).origin

    if (!iconUrl) {
      const tabs = await browser.tabs.query({})
      const tab = tabs.find(
        (tab) => tab.url && new URL(tab.url).origin === origin
      )
      if (tab) {
        iconUrl = tab.favIconUrl
      }
    }

    const conns: IConnectedSite[] = []
    for (const wallet of wallets) {
      const existing = await this.getConnectedSite(wallet, href, false)
      if (existing) {
        existing.iconUrl = iconUrl || existing.iconUrl
        existing.connected = booleanToNumber(true)
        existing.info.connectedAt = Date.now()
        conns.push(existing)
      } else {
        const add = {
          masterId: wallet.masterId,
          index: wallet.index,
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
    wallet: IWalletInfo,
    href: string,
    connected = true
  ): Promise<IConnectedSite | undefined> {
    const origin = new URL(href).origin
    return DB.connectedSites
      .where('[masterId+index+origin+connected]')
      .equals([wallet.masterId, wallet.index, origin, booleanToNumber(connected)] as Array<any>)
      .first()
  }

  async getConnectedSitesByWallet(
    wallet: IWalletInfo,
    connected = true
  ): Promise<IConnectedSite[]> {
    return DB.connectedSites
      .where('[masterId+index+connected]')
      .equals([wallet.masterId, wallet.index, booleanToNumber(connected)] as Array<any>)
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

  async disconnectSitesByWallet(wallet: IWalletInfo) {
    await DB.connectedSites
      .where('[masterId+index+connected]')
      .equals([wallet.masterId, wallet.index, booleanToNumber(true)] as Array<any>)
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
