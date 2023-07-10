import { EventFilter } from '@ethersproject/abstract-provider'
import { BaseProvider } from '@ethersproject/providers'
import { ethErrors } from 'eth-rpc-errors'
import { ethers } from 'ethers'

import { EVM_PROVIDER_NAME, IEvmProviderService } from '~lib/inject/evm'
import { NetworkKind } from '~lib/network'
import { Context, Listener, SERVICE_WORKER_SERVER } from '~lib/rpc'
import { INetwork } from '~lib/schema'
import { PASSWORD_SERVICE } from '~lib/services/passwordService'
import { BaseProviderService } from '~lib/services/provider/base'

import { EvmClient } from './client'
import { EvmPermissionedProvider } from './permissionedProvider'

class EvmProviderService
  extends BaseProviderService
  implements IEvmProviderService
{
  private provider?: BaseProvider
  private subscriptions = new Map<string, [string | EventFilter, Listener]>()

  constructor() {
    super(NetworkKind.EVM)
  }

  async state(ctx: Context) {
    let network, accounts
    const provider = await EvmPermissionedProvider.from(ctx.fromUrl!)
    if (provider) {
      network = provider.network
      accounts = provider.accounts.map((acc) => acc.address!)
    }
    return {
      isUnlocked: await PASSWORD_SERVICE.isUnlocked(),
      chainId: network
        ? ethers.utils.hexStripZeros(ethers.utils.hexlify(network.chainId))
        : undefined,
      networkVersion: network ? String(network.chainId) : undefined,
      isConnected: navigator.onLine,
      accounts: accounts || []
    }
  }

  protected override async switchNetwork(network?: INetwork) {
    // retain subscriptions
    const blockSub = this.provider?.listeners('block')
    const pendingSub = this.provider?.listeners('pending')
    // remove subscriptions from old provider
    this.provider?.removeAllListeners('block')
    this.provider?.removeAllListeners('pending')

    this.provider = network ? await EvmClient.from(network) : undefined

    // add subscriptions to new provider
    blockSub?.forEach((listener) => this.provider?.on('block', listener))
    pendingSub?.forEach((listener) => this.provider?.on('pending', listener))
  }

  protected override async emitNetworkChange(network?: INetwork) {
    this.emit('networkChanged', {
      chainId: network
        ? ethers.utils.hexStripZeros(ethers.utils.hexlify(network.chainId))
        : '',
      networkVersion: network ? String(network.chainId) : null
    })
  }

  protected override emitAccountsChange() {
    // here do not carry new accounts, since the injected script will fetch them
    this.emit('accountsChanged')
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
}

SERVICE_WORKER_SERVER.registerService(
  EVM_PROVIDER_NAME,
  new EvmProviderService(),
  true
)
