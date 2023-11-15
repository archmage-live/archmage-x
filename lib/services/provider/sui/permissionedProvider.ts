import { arrayify, hexlify } from '@ethersproject/bytes'
import { TransactionBlock } from '@mysten/sui.js/transactions'
import assert from 'assert'
import { ethErrors } from 'eth-rpc-errors'

import { getActiveNetworkByKind } from '~lib/active'
import { Context } from '~lib/inject/client'
import { NetworkKind } from '~lib/network'
import { INetwork } from '~lib/schema'
import {
  CONSENT_SERVICE,
  ConsentType,
  SignMsgPayload
} from '~lib/services/consentService'
import { NETWORK_SERVICE } from '~lib/services/network'
import { getSigningWallet } from '~lib/wallet'

import { BasePermissionedProvider } from '../base'
import { SuiClient, getSuiClient } from './client'
import { SuiTransactionPayload } from './types'

export class SuiPermissionedProvider extends BasePermissionedProvider {
  private constructor(
    network: INetwork,
    public client: SuiClient,
    origin: string
  ) {
    super(network, origin)
    assert(network.kind === NetworkKind.SUI)
  }

  static async fromMayThrow(fromUrl: string): Promise<SuiPermissionedProvider> {
    const provider = await SuiPermissionedProvider.from(fromUrl)
    if (!provider) {
      // no active network
      throw ethErrors.provider.disconnected()
    }
    return provider
  }

  static async from(
    fromUrl: string
  ): Promise<SuiPermissionedProvider | undefined> {
    const network = await getActiveNetworkByKind(NetworkKind.SUI)
    if (!network) {
      return
    }

    const client = await getSuiClient(network)
    if (!client) {
      return
    }
    const permissionedProvider = new SuiPermissionedProvider(
      network,
      client,
      new URL(fromUrl).origin
    )

    await permissionedProvider.fetchConnectedAccounts()

    return permissionedProvider
  }

  async request(ctx: Context, method: string, params: any[]): Promise<any> {
    try {
      switch (method) {
        case 'chains':
          return await this.getChains()
        case 'connect':
          return await this.connect(ctx, params[0])
        case 'accounts':
          return await this.getAccounts()
        case 'signTransactionBlock':
          return await this.signTransactionBlock(ctx, params[0])
        case 'signAndExecuteTransactionBlock':
          return await this.signAndExecuteTransactionBlock(ctx, params[0])
        case 'signMessage':
          return await this.signMessage(ctx, params[0])
        case 'stake':
          return await this.stake(ctx, params[0])
        default:
          throw Error('not implemented')
      }
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  async getChains() {
    const networks = await NETWORK_SERVICE.getNetworks(NetworkKind.SUI)
    return networks.map((network) => network.chainId)
  }

  async connect(ctx: Context, silent: boolean) {
    if (!silent) {
      await this.requestAccounts(ctx)
    }

    return {
      network: this.network.chainId,
      accounts: await this.getAccounts()
    }
  }

  async getAccounts() {
    if (!this.account) {
      return []
    }
    const signer = await getSigningWallet(this.account)
    return [
      {
        address: this.account.address!,
        publicKey: signer?.publicKey
      }
    ]
  }

  async signTransactionBlock(ctx: Context, transaction: string) {
    if (!this.account?.address) {
      throw ethErrors.provider.unauthorized()
    }

    const tx = TransactionBlock.from(transaction)
    tx.setSender(this.account.address)

    // call build to check and fill parameters
    await tx.build({ client: this.client })

    return await CONSENT_SERVICE.requestConsent(
      {
        networkId: this.network.id,
        accountId: this.account.id,
        type: ConsentType.SIGN_TRANSACTION,
        origin: this.origin,
        payload: {
          txParams: tx.serialize()
        } as SuiTransactionPayload
      },
      ctx
    )
  }

  async signAndExecuteTransactionBlock(ctx: Context, transaction: string) {
    if (!this.account?.address) {
      throw ethErrors.provider.unauthorized()
    }

    const tx = TransactionBlock.from(transaction)
    tx.setSender(this.account.address)

    // call build to check and fill parameters
    await tx.build({ client: this.client })

    return await CONSENT_SERVICE.requestConsent(
      {
        networkId: this.network.id,
        accountId: this.account.id,
        type: ConsentType.TRANSACTION,
        origin: this.origin,
        payload: {
          txParams: tx.serialize()
        } as SuiTransactionPayload
      },
      ctx
    )
  }

  async signMessage(ctx: Context, message: string) {
    if (!this.account?.address) {
      throw ethErrors.provider.unauthorized()
    }

    message = hexlify(arrayify(message))

    return await CONSENT_SERVICE.requestConsent(
      {
        networkId: this.network.id,
        accountId: this.account.id,
        type: ConsentType.SIGN_MSG,
        origin: this.origin,
        payload: {
          message
        } as SignMsgPayload
      },
      ctx
    )
  }

  async stake(ctx: Context, validator: string) {
    // TODO
  }
}
