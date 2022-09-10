import { liveQuery } from 'dexie'
import { ethers } from 'ethers'

import {
  getActiveNetworkByKind,
  watchActiveNetworkChange,
  watchActiveWalletChange
} from '~lib/active'
import { DB } from '~lib/db'
import { NetworkKind } from '~lib/network'
import { watchPasswordUnlocked } from '~lib/password'
import {
  Context,
  EventEmitter,
  EventType,
  Listener,
  SERVICE_WORKER_SERVER
} from '~lib/rpc'
import { PASSWORD_SERVICE } from '~lib/services/passwordService'
import { EvmPermissionedProvider } from '~lib/services/provider/evm/permissioned'

export const EVM_PROVIDER_NAME = 'evmProvider' as const

export interface IEvmProviderService extends EventEmitter {
  state(ctx?: Context): Promise<{
    isUnlocked: boolean
    chainId?: string
    networkVersion?: string
    isConnected: boolean
    accounts: string[]
  }>

  request(
    args: { method: string; params?: Array<any> },
    ctx?: Context
  ): Promise<any>
}

class EvmProviderService implements IEvmProviderService {
  private listeners = new Map<EventType, Listener[]>()

  constructor() {
    watchPasswordUnlocked((isUnlocked) => {
      this.listeners
        .get('unlocked')
        ?.forEach((listener) => listener(isUnlocked))
    })

    watchActiveNetworkChange(async () => {
      const network = await getActiveNetworkByKind(NetworkKind.EVM)
      this.listeners.get('networkChanged')?.forEach((listener) =>
        listener({
          chainId: network
            ? ethers.utils.hexStripZeros(ethers.utils.hexlify(network.chainId))
            : '',
          networkVersion: network ? String(network.chainId) : null
        })
      )
    })

    const handleAccountsChanged = () =>
      this.listeners.get('accountsChanged')?.forEach((listener) => listener())

    watchActiveWalletChange(handleAccountsChanged)

    DB.connectedSites.hook('creating', handleAccountsChanged)
    DB.connectedSites.hook('updating', handleAccountsChanged)
    DB.connectedSites.hook('deleting', handleAccountsChanged)
  }

  async state(ctx: Context) {
    let network, accounts
    const provider = await EvmPermissionedProvider.from(ctx.fromUrl!)
    if (provider) {
      network = provider.network
      accounts = await provider.getConnectedAccounts()
    }
    return {
      isUnlocked: await PASSWORD_SERVICE.isUnlocked(),
      chainId: network
        ? ethers.utils.hexStripZeros(ethers.utils.hexlify(network.chainId))
        : undefined,
      networkVersion: network ? String(network.chainId) : undefined,
      isConnected: navigator.onLine,
      accounts: accounts?.map((acc) => acc.address!) || []
    }
  }

  async request(
    args: {
      method: string
      params?: Array<any>
    },
    ctx: Context
  ): Promise<any> {
    const provider = await EvmPermissionedProvider.fromMayThrow(ctx.fromUrl!)
    return provider.send(ctx, args.method, args.params ?? [])
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

SERVICE_WORKER_SERVER.registerService(
  EVM_PROVIDER_NAME,
  new EvmProviderService(),
  true
)
