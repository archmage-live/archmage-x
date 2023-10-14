import assert from 'assert'
import { ethErrors } from 'eth-rpc-errors'

import { getActiveNetworkByKind } from '~lib/active'
import { Context } from '~lib/inject/client'
import { NetworkKind } from '~lib/network'
import { INetwork } from '~lib/schema'

import { BasePermissionedProvider } from '../base'
import { AleoNetworkClient } from './client'

export class AleoPermissionedProvider extends BasePermissionedProvider {
  client: AleoNetworkClient

  private constructor(network: INetwork, origin: string) {
    assert(network.kind === NetworkKind.ALEO)
    super(network, origin)

    this.client = new AleoNetworkClient(network)
  }

  static async fromMayThrow(
    fromUrl: string
  ): Promise<AleoPermissionedProvider> {
    const provider = await AleoPermissionedProvider.from(fromUrl)
    if (!provider) {
      // no active network
      throw ethErrors.provider.disconnected()
    }
    return provider
  }

  static async from(
    fromUrl: string
  ): Promise<AleoPermissionedProvider | undefined> {
    const network = await getActiveNetworkByKind(NetworkKind.ALEO)
    if (!network) {
      return
    }

    const permissionedProvider = new AleoPermissionedProvider(
      network,
      new URL(fromUrl).origin
    )

    await permissionedProvider.fetchConnectedAccounts()

    return permissionedProvider
  }

  async request(ctx: Context, method: string, params: any[]): Promise<any> {
    try {
      switch (method) {
        default:
          throw Error('not implemented')
      }
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  async requestRecords(program: string) {
    this.client
  }
}
