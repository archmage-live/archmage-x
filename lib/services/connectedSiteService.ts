import { DB } from '~lib/db'
import { ENV } from '~lib/env'
import { SERVICE_WORKER_CLIENT, SERVICE_WORKER_SERVER } from '~lib/rpc'
import { IWalletInfo } from '~lib/schema'
import { IConnectedSite } from '~lib/schema/connectedSite'

interface IConnectedSiteService {
  connectSite(
    wallet: IWalletInfo,
    href: string,
    iconUrl?: string,
    connected?: boolean
  ): Promise<IConnectedSite>

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
    wallet: IWalletInfo,
    href: string,
    iconUrl?: string,
    connected = true
  ): Promise<IConnectedSite> {
    const existing = await this.getConnectedSite(wallet, href, false)
    if (existing) {
      existing.connected = true
      existing.info.connectedAt = Date.now()
      await DB.connectedSites.put(existing)
      return existing
    }

    const origin = new URL(href).origin

    const connectedSite = {
      masterId: wallet.masterId,
      index: wallet.index,
      origin,
      iconUrl,
      connected,
      info: {
        connectedAt: Date.now()
      }
    } as IConnectedSite
    connectedSite.id = await DB.connectedSites.add(connectedSite)

    return connectedSite
  }

  async getConnectedSite(
    wallet: IWalletInfo,
    href: string,
    connected = true
  ): Promise<IConnectedSite | undefined> {
    const origin = new URL(href).origin
    return DB.connectedSites
      .where('[masterId+index+origin+connected]')
      .equals([wallet.masterId, wallet.index, origin, connected] as Array<any>)
      .first()
  }

  async getConnectedSitesByWallet(
    wallet: IWalletInfo,
    connected = true
  ): Promise<IConnectedSite[]> {
    return DB.connectedSites
      .where('[masterId+index+connected]')
      .equals([wallet.masterId, wallet.index, connected] as Array<any>)
      .toArray()
  }

  async getConnectedSitesBySite(
    href: string,
    connected = true
  ): Promise<IConnectedSite[]> {
    const origin = new URL(href).origin
    return DB.connectedSites
      .where('[origin+connected]')
      .equals([origin, connected] as Array<any>)
      .toArray()
  }

  async disconnectSite(id: number) {
    await DB.connectedSites.delete(id)
  }

  async disconnectSitesByWallet(wallet: IWalletInfo) {
    await DB.connectedSites
      .where('[masterId+index+connected]')
      .equals([wallet.masterId, wallet.index, true] as Array<any>)
      .modify({ connected: false })
  }

  async disconnectSitesBySite(href: string) {
    const origin = new URL(href).origin
    await DB.connectedSites
      .where('[origin+connected]')
      .equals([origin, true] as Array<any>)
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
