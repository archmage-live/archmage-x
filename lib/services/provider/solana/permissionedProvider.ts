import { arrayify, hexlify } from '@ethersproject/bytes'
import type {
  SolanaSignAndSendTransactionOptions,
  SolanaSignInInput
} from '@solana/wallet-standard-features'
import { createSignInMessageText } from '@solana/wallet-standard-util'
import type { SolanaSignInInputWithRequiredFields } from '@solana/wallet-standard-util'
import { VersionedTransaction } from '@solana/web3.js'
import assert from 'assert'
import { ethErrors } from 'eth-rpc-errors'

import { getActiveNetworkByKind } from '~lib/active'
import { Context } from '~lib/inject/client'
import { NetworkKind } from '~lib/network'
import { INetwork } from '~lib/schema'
import {
  CONSENT_SERVICE,
  ConsentType,
  SignInPayload,
  SignMsgPayload
} from '~lib/services/consentService'
import { NETWORK_SERVICE } from '~lib/services/network'
import { TransactionPayload } from '~lib/services/provider'
import { SolanaTransactionPayload } from '~lib/services/provider/solana/types'
import { getSigningWallet } from '~lib/wallet'

import { BasePermissionedProvider } from '../base'
import { SolanaClient, getSolanaClient } from './client'

export class SolanaPermissionedProvider extends BasePermissionedProvider {
  private constructor(
    network: INetwork,
    public client: SolanaClient,
    origin: string
  ) {
    super(network, origin)
    assert(network.kind === NetworkKind.SOLANA)
  }

  static async fromMayThrow(
    fromUrl: string
  ): Promise<SolanaPermissionedProvider> {
    const provider = await SolanaPermissionedProvider.from(fromUrl)
    if (!provider) {
      // no active network
      throw ethErrors.provider.disconnected()
    }
    return provider
  }

  static async from(
    fromUrl: string
  ): Promise<SolanaPermissionedProvider | undefined> {
    const network = await getActiveNetworkByKind(NetworkKind.SOLANA)
    if (!network) {
      return
    }

    const client = getSolanaClient(network)
    if (!client) {
      return
    }
    const permissionedProvider = new SolanaPermissionedProvider(
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
        case 'disconnect':
          return await this.disconnect(ctx)
        case 'accounts':
          return await this.getAccounts()
        case 'signAndSendTransaction':
          return await this.signAndSendTransaction(
            ctx,
            params[0],
            params[1],
            params[2]
          )
        case 'signTransaction':
          return await this.signTransaction(ctx, params[0])
        case 'signAllTransactions':
          return await this.signAllTransactions(ctx, params[0])
        case 'signMessage':
          return await this.signMessage(ctx, params[0])
        case 'signIn':
          return await this.signIn(ctx, params[0])
        default:
          throw Error('not implemented')
      }
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  async getChains() {
    const networks = await NETWORK_SERVICE.getNetworks(NetworkKind.SOLANA)
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

  async disconnect(ctx: Context) {
    // TODO
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

  async signAndSendTransaction(
    ctx: Context,
    transaction: string,
    chainId: string,
    options?: SolanaSignAndSendTransactionOptions
  ) {
    if (!this.account?.address) {
      throw ethErrors.provider.unauthorized()
    }
    if (chainId !== this.network.chainId) {
      throw ethErrors.rpc.invalidParams('Mismatched chainId')
    }

    VersionedTransaction.deserialize(arrayify(transaction))

    return await CONSENT_SERVICE.requestConsent(
      {
        networkId: this.network.id,
        accountId: this.account.id,
        type: ConsentType.TRANSACTION,
        origin: this.origin,
        payload: {
          txParams: [transaction]
        } as SolanaTransactionPayload
      },
      ctx
    )
  }

  async signTransaction(ctx: Context, transaction: string) {
    if (!this.account?.address) {
      throw ethErrors.provider.unauthorized()
    }

    return await CONSENT_SERVICE.requestConsent(
      {
        networkId: this.network.id,
        accountId: this.account.id,
        type: ConsentType.SIGN_TRANSACTION,
        origin: this.origin,
        payload: {
          txParams: [transaction]
        } as SolanaTransactionPayload
      },
      ctx
    )
  }

  async signAllTransactions(ctx: Context, transactions: string[]) {
    if (!this.account?.address) {
      throw ethErrors.provider.unauthorized()
    }

    return await CONSENT_SERVICE.requestConsent(
      {
        networkId: this.network.id,
        accountId: this.account.id,
        type: ConsentType.SIGN_TRANSACTION,
        origin: this.origin,
        payload: {
          txParams: transactions
        } as TransactionPayload
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

  // https://github.com/phantom/sign-in-with-solana
  // https://phantom.app/learn/developers/sign-in-with-solana
  async signIn(ctx: Context, input: SolanaSignInInput) {
    if (!this.account?.address) {
      throw ethErrors.provider.unauthorized()
    }

    const url = new URL(ctx.fromUrl!)

    input = {
      ...input,
      domain: input.domain || url.host,
      address: input.address || this.account.address
    }

    // verify
    {
      const errors = []
      const now = Date.now()

      const data = input
      if (data.address !== this.account.address) {
        errors.push('address mismatch')
      }
      if (data.domain !== url.host) {
        errors.push('domain mismatch')
      }
      if (data.uri && new URL(data.uri).origin !== url.origin) {
        errors.push('uri mismatch')
      }
      if (data.chainId && data.chainId !== this.network.chainId) {
        errors.push('chain id mismatch')
      }

      // verify if parsed issuedAt is within +- issuedAtThreshold of the current timestamp
      // NOTE: Phantom's issuedAtThreshold is 10 minutes
      const issuedAtThreshold = 10 * 60 * 1000 // 10 minutes
      if (data.issuedAt) {
        const iat = new Date(data.issuedAt).getTime()
        if (Math.abs(iat - now) > issuedAtThreshold) {
          if (iat < now) {
            errors.push('issued too far in the past')
          } else {
            errors.push('issued too far in the future')
          }
        }
      }

      // verify if parsed expirationTime is:
      // 1. after the current timestamp
      // 2. after the parsed issuedAt
      // 3. after the parsed notBefore
      if (data.expirationTime) {
        const exp = new Date(data.expirationTime).getTime()
        if (exp <= now) {
          errors.push('expired')
        }
        if (data.issuedAt && exp < new Date(data.issuedAt).getTime()) {
          errors.push('expires before issuance')
        }
        // Not Before
        if (data.notBefore) {
          const nbf = new Date(data.notBefore).getTime()
          if (nbf > exp) {
            errors.push('valid after expiration')
          }
        }
      }

      if (errors.length) {
        throw ethErrors.rpc.invalidParams(errors.join('; '))
      }
    }

    const message = createSignInMessageText(
      input as SolanaSignInInputWithRequiredFields
    )

    return await CONSENT_SERVICE.requestConsent(
      {
        networkId: this.network.id,
        accountId: this.account.id,
        type: ConsentType.SIGN_IN,
        origin: this.origin,
        payload: {
          input,
          signedMessage: message
        } as SignInPayload
      },
      ctx
    )
  }
}
