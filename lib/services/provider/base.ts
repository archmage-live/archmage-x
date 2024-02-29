import { ethErrors } from 'eth-rpc-errors'

import {
  getActiveNetworkByKind,
  watchActiveNetworkChange,
  watchActiveWalletChange
} from '~lib/active'
import { Context, EventType, Listener } from '~lib/inject/client'
import { NetworkKind } from '~lib/network'
import { watchPasswordUnlocked } from '~lib/password'
import { ChainId, IChainAccount, INetwork } from '~lib/schema'
import {
  CONNECTED_SITE_SERVICE,
  getConnectedAccountsBySite,
  watchConnectedSitesChange
} from '~lib/services/connectedSiteService'
import {
  AddNetworkPayload,
  CONSENT_SERVICE,
  ConsentRequest,
  ConsentType,
  Permission,
  RequestPermissionPayload
} from '~lib/services/consentService'
import { NETWORK_SERVICE } from '~lib/services/network'
import { PASSWORD_SERVICE } from '~lib/services/passwordService'

export class BasePermissionedProvider {
  accounts: IChainAccount[] = [] // connected accounts for the site
  account?: IChainAccount // active or default connected account for the site

  protected constructor(public network: INetwork, public origin: string) {}

  async fetchConnectedAccounts() {
    if (await PASSWORD_SERVICE.isUnlocked()) {
      this.accounts = await getConnectedAccountsBySite(
        this.origin,
        this.network
      )
      if (this.accounts.length) {
        this.account = this.accounts[0]
      } else {
        this.account = undefined
      }
    } else {
      this.accounts = []
      this.account = undefined
    }
  }

  async disconnectConnectedAccounts() {
    await CONNECTED_SITE_SERVICE.disconnectSitesBySite(this.origin)
    await this.fetchConnectedAccounts()
  }

  // https://eips.ethereum.org/EIPS/eip-1102
  async requestAccounts(ctx: Context, data?: any) {
    if (await PASSWORD_SERVICE.isLocked()) {
      await CONSENT_SERVICE.requestConsent(
        {
          networkId: undefined,
          accountId: undefined,
          type: ConsentType.UNLOCK,
          origin: this.origin,
          payload: {}
        } as any as ConsentRequest,
        ctx
      )
    }

    await this.fetchConnectedAccounts()

    if (!this.accounts.length) {
      await this._requestPermissions(ctx, [
        { permission: Permission.ACCOUNT, data }
      ])
    }
  }

  // https://eips.ethereum.org/EIPS/eip-2255
  async getPermissions() {
    const addresses = this.accounts.map((acc) => acc.address!)

    return [
      {
        invoker: this.origin,
        parentCapability: 'eth_accounts',
        caveats: [
          {
            type: 'filterResponse',
            value: addresses
          },
          {
            type: 'restrictReturnedAccounts', // MetaMask
            value: addresses
          }
        ]
      }
    ]
  }

  // https://eips.ethereum.org/EIPS/eip-2255
  async _requestPermissions(
    ctx: Context,
    permissions: { permission: Permission; data?: any }[]
  ) {
    await CONSENT_SERVICE.requestConsent(
      {
        networkId: this.network.id!,
        accountId: [],
        type: ConsentType.REQUEST_PERMISSION,
        origin: this.origin,
        payload: {
          permissions
        } as RequestPermissionPayload
      },
      ctx
    )

    await this.fetchConnectedAccounts()
  }

  async _addChain(
    ctx: Context,
    networkKind: NetworkKind,
    chainId: ChainId,
    info: any
  ) {
    await CONSENT_SERVICE.requestConsent(
      {
        networkId: undefined,
        accountId: undefined,
        type: ConsentType.ADD_NETWORK,
        origin: this.origin,
        payload: {
          networkKind,
          chainId,
          info
        } as AddNetworkPayload
      } as any as ConsentRequest,
      ctx
    )
    await this._switchChain(ctx, networkKind, chainId)
  }

  async _switchChain(ctx: Context, networkKind: NetworkKind, chainId: ChainId) {
    const network = await NETWORK_SERVICE.getNetwork({
      kind: networkKind,
      chainId
    })
    if (!network) {
      throw ethErrors.rpc.invalidRequest(
        'Chain with the specified chainId is not found'
      )
    }

    if (network.id === this.network.id) {
      return
    }

    await CONSENT_SERVICE.requestConsent(
      {
        networkId: network.id,
        accountId: undefined,
        type: ConsentType.SWITCH_NETWORK,
        origin: this.origin,
        payload: {}
      } as any as ConsentRequest,
      ctx
    )
  }
}

export class BaseProviderService {
  private listeners = new Map<EventType, Listener[]>()

  constructor(networkKind: NetworkKind) {
    watchPasswordUnlocked((isUnlocked) => {
      this.emit('unlocked', isUnlocked)
    })

    getActiveNetworkByKind(networkKind).then((network) =>
      this.switchNetwork(network)
    )

    watchActiveNetworkChange(async () => {
      const network = await getActiveNetworkByKind(networkKind)
      await this.switchNetwork(network)
      await this.emitNetworkChange(network)
    })

    const handleAccountsChanged = () => this.emitAccountsChange()

    watchActiveWalletChange(handleAccountsChanged)

    watchConnectedSitesChange(handleAccountsChanged)
  }

  protected async switchNetwork(network?: INetwork) {
    throw new Error('not implemented')
  }

  protected async emitNetworkChange(network?: INetwork) {
    throw new Error('not implemented')
  }

  protected emitAccountsChange() {
    throw new Error('not implemented')
  }

  protected emit(eventName: EventType, ...args: any[]) {
    this.listeners.get(eventName)?.forEach((listener) => listener(...args))
  }

  on(eventName: EventType, listener: Listener): void {
    let listeners = this.listeners.get(eventName)
    if (!listeners) {
      listeners = []
      this.listeners.set(eventName, listeners)
    }
    listeners.push(listener)
  }

  off(eventName: EventType, listener: Listener): void {
    const listeners = this.listeners.get(eventName)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }
}
