import assert from 'assert'
import { ethErrors } from 'eth-rpc-errors'

import { getActiveNetworkByKind } from '~lib/active'
import { Context } from '~lib/inject/client'
import { NetworkKind } from '~lib/network'
import { INetwork } from '~lib/schema'
import {
  AddEthereumChainParameter,
  SwitchEthereumChainParameter,
  WatchAssetParameters
} from '~lib/services/provider/evm/permissionedProvider'
import {
  StarknetClient,
  getStarknetClient
} from '~lib/services/provider/starknet/client'

import { BasePermissionedProvider } from '../base'

export class StarknetPermissionedProvider extends BasePermissionedProvider {
  private constructor(
    network: INetwork,
    public client: StarknetClient,
    origin: string
  ) {
    super(network, origin)
    assert(network.kind === NetworkKind.STARKNET)
  }

  static async fromMayThrow(
    fromUrl: string
  ): Promise<StarknetPermissionedProvider> {
    const provider = await StarknetPermissionedProvider.from(fromUrl)
    if (!provider) {
      // no active network
      throw ethErrors.provider.disconnected()
    }
    return provider
  }

  static async from(
    fromUrl: string
  ): Promise<StarknetPermissionedProvider | undefined> {
    const network = await getActiveNetworkByKind(NetworkKind.STARKNET)
    if (!network) {
      return
    }

    const client = await getStarknetClient(network)
    if (!client) {
      return
    }
    const permissionedProvider = new StarknetPermissionedProvider(
      network,
      client,
      new URL(fromUrl).origin
    )

    await permissionedProvider.fetchConnectedAccounts()

    return permissionedProvider
  }

  async request(ctx: Context, method: string, params: any[]) {
    try {
      switch (method) {
        case 'enable':
        case 'accounts':
        case 'execute':
        case 'signMessage':
        case 'wallet_addStarknetChain':
          return await this.addChain(ctx, params[0])
        case 'wallet_switchStarknetChain':
          return await this.switchChain(ctx, params[0])
        case 'wallet_watchAsset':
          return await this.watchAsset(ctx, params[0])
      }
    } catch (e) {}
  }

  async addChain(ctx: Context, params: AddStarknetChainParameters) {}

  async switchChain(ctx: Context, params: SwitchStarknetChainParameter) {}

  async watchAsset(ctx: Context, params: WatchStarknetAssetParameters) {}
}

export interface AddStarknetChainParameters extends AddEthereumChainParameter {
  baseUrl: string
  rpcUrl?: string | string[]
  blockExplorerUrl?: string | string[]
}

export interface SwitchStarknetChainParameter
  extends SwitchEthereumChainParameter {}

export interface WatchStarknetAssetParameters extends WatchAssetParameters {
  options: WatchAssetParameters['options'] & {
    name?: string
  }
}
