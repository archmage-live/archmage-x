import { EventFilter } from '@ethersproject/abstract-provider'
import { ethErrors } from 'eth-rpc-errors'
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
import { INetwork } from '~lib/schema'
import { PASSWORD_SERVICE } from '~lib/services/passwordService'
import { EvmProvider } from '~lib/services/provider/evm'
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
  private provider?: EvmProvider
  private listeners = new Map<EventType, Listener[]>()
  private subscriptions = new Map<string, [string | EventFilter, Listener]>()

  constructor() {
    getActiveNetworkByKind(NetworkKind.EVM).then((network) =>
      this.switchNetwork(network)
    )

    watchPasswordUnlocked((isUnlocked) => {
      this.emit('unlocked', isUnlocked)
    })

    watchActiveNetworkChange(async () => {
      const network = await getActiveNetworkByKind(NetworkKind.EVM)
      await this.switchNetwork(network)
      this.emit('networkChanged', {
        chainId: network
          ? ethers.utils.hexStripZeros(ethers.utils.hexlify(network.chainId))
          : '',
        networkVersion: network ? String(network.chainId) : null
      })
    })

    const handleAccountsChanged = () => this.emit('accountsChanged')

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
    switch (args.method) {
      case 'eth_subscribe':
        return this.subscribe(args.params || [])
      case 'eth_unsubscribe':
        return this.unsubscribe(args.params || [])
    }

    const provider = await EvmPermissionedProvider.fromMayThrow(ctx.fromUrl!)
    return provider.send(ctx, args.method, args.params || [])
  }

  private async switchNetwork(network?: INetwork) {
    // retain subscriptions
    const blockSub = this.provider?.listeners('block')
    const pendingSub = this.provider?.listeners('pending')
    // remove subscriptions from old provider
    this.provider?.removeAllListeners('block')
    this.provider?.removeAllListeners('pending')

    this.provider = network ? await EvmProvider.from(network) : undefined

    // add subscriptions to new provider
    blockSub?.forEach((listener) => this.provider?.on('block', listener))
    pendingSub?.forEach((listener) => this.provider?.on('pending', listener))
  }

  // https://geth.ethereum.org/docs/rpc/pubsub
  private async subscribe([subscription, ...params]: Array<any>) {
    if (!this.provider) {
      throw ethErrors.provider.disconnected()
    }

    // generate subscription id
    const subscriptionId = ethers.utils.hexlify(ethers.utils.randomBytes(16))

    let eventName, listener
    switch (subscription) {
      case 'newHeads':
        eventName = 'block'
        listener = async (blockNumber: number) => {
          if (!this.provider) {
            return
          }
          const block = await this.provider.perform('getBlock', {
            blockTag: ethers.utils.hexValue(blockNumber),
            includeTransactions: false
          })
          this.emitSubscription(subscriptionId, block)
        }
        break

      case 'newPendingTransactions':
        throw ethErrors.rpc.internal(
          'unsupported subscription type "newPendingTransactions"'
        )
      // eventName = 'pending'
      // listener = (tx: any) => {}
      // break

      case 'logs':
        const { address, topics } = params[0] || {}
        eventName = { address, topics } as EventFilter
        listener = (result: any) => {
          this.emitSubscription(subscriptionId, result)
        }
        break

      default:
        throw ethErrors.rpc.invalidParams(
          `unsupported subscription type "${subscription}"`
        )
    }

    // subscribe on provider
    this.provider.on(eventName, listener)
    // record subscription relationship
    this.subscriptions.set(subscriptionId, [eventName, listener])

    return subscriptionId
  }

  private async unsubscribe([subscriptionId]: Array<any>) {
    const [eventName, listener] = this.subscriptions.get(subscriptionId) || []
    if (eventName && listener) {
      this.provider?.off(eventName, listener)
    }
    return true
  }

  private emitSubscription(subscriptionId: string, result: any) {
    this.emit('message', {
      type: 'eth_subscription',
      data: {
        subscription: subscriptionId,
        result
      }
    })
  }

  private emit(eventName: EventType, ...args: any[]) {
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

SERVICE_WORKER_SERVER.registerService(
  EVM_PROVIDER_NAME,
  new EvmProviderService(),
  true
)
