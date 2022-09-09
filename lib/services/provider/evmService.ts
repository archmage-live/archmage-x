import { ethers } from 'ethers'

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
  info(ctx?: Context): Promise<{
    isUnlocked: boolean
    chainId: string
    networkVersion: string
    connected: boolean
    activeAddress: string | undefined
  }>

  request(
    args: { method: string; params?: Array<any> },
    ctx?: Context
  ): Promise<any>
}

class EvmProviderService implements IEvmProviderService {
  async info(ctx: Context) {
    const provider = await EvmPermissionedProvider.from(ctx.fromUrl!)
    const network = provider.network
    return {
      isUnlocked: await PASSWORD_SERVICE.isUnlocked(),
      chainId: ethers.utils.hexStripZeros(
        ethers.utils.hexlify(network.chainId)
      ),
      networkVersion: String(network.chainId),
      connected: navigator.onLine,
      activeAddress: provider.account?.address
    }
  }

  async request(
    args: {
      method: string
      params?: Array<any>
    },
    ctx: Context
  ): Promise<any> {
    const provider = await EvmPermissionedProvider.from(ctx.fromUrl!)
    return provider.send(ctx, args.method, args.params ?? [])
  }

  on(eventName: EventType, listener: Listener): void {}

  off(eventName: EventType, listener: Listener): void {}
}

SERVICE_WORKER_SERVER.registerService(
  EVM_PROVIDER_NAME,
  new EvmProviderService(),
  true
)
