import {
  AptosAccount,
  AptosClient,
  BCS,
  HexString,
  OptionalTransactionArgs,
  TxnBuilderTypes,
  Types
} from 'aptos'
import assert from 'assert'
import { ethErrors } from 'eth-rpc-errors'

import { getActiveNetworkByKind } from '~lib/active'
import { Context } from '~lib/inject/client'
import { NetworkKind } from '~lib/network'
import { INetwork } from '~lib/schema'
import { CONSENT_SERVICE, ConsentType } from '~lib/services/consentService'
import { TransactionPayload } from '~lib/services/provider'
import { getAptosClient } from '~lib/services/provider/aptos/client'
import { AptosProviderAdaptor } from '~lib/services/provider/aptos/providerAdaptor'
import { isEntryFunctionPayload } from '~lib/services/provider/aptos/types'
import { BasePermissionedProvider } from '~lib/services/provider/base'
import { getSigningWallet } from '~lib/wallet'

export class AptosPermissionedProvider extends BasePermissionedProvider {
  private constructor(
    network: INetwork,
    public client: AptosClient,
    origin: string
  ) {
    super(network, origin)
    assert(network.kind === NetworkKind.APTOS)
  }

  static async fromMayThrow(
    fromUrl: string
  ): Promise<AptosPermissionedProvider> {
    const provider = await AptosPermissionedProvider.from(fromUrl)
    if (!provider) {
      // no active network
      throw ethErrors.provider.disconnected()
    }
    return provider
  }

  static async from(
    fromUrl: string
  ): Promise<AptosPermissionedProvider | undefined> {
    const network = await getActiveNetworkByKind(NetworkKind.APTOS)
    if (!network) {
      return
    }

    const client = await getAptosClient(network)
    if (!client) {
      return
    }
    const permissionedProvider = new AptosPermissionedProvider(
      network,
      client,
      new URL(fromUrl).origin
    )

    await permissionedProvider.fetchConnectedAccounts()

    return permissionedProvider
  }

  async request(ctx: Context, method: string, params: any[]) {
    switch (method) {
      // https://aptos.dev/guides/building-your-own-wallet
      case 'connect': {
        await this.connect(ctx)
        return this.getActiveAccount()
      }
      case 'disconnect':
        return this.disconnect()
      case 'isConnected':
        return !!this.account
      case 'account':
        return this.getActiveAccount()
      case 'signAndSubmitTransaction':
        return this.signAndSubmitTransaction(ctx, params[0])
      case 'signMessage':

      // https://aptos-labs.github.io/ts-sdk-doc/classes/AptosClient.html
      // query
      case 'getAccount':
        return (this.client?.getAccount as any)(...params)
      case 'getAccountTransactions':
        return (this.client?.getAccountTransactions as any)(...params)
      case 'getAccountModules':
        return (this.client?.getAccountModules as any)(...params)
      case 'getAccountModule':
        return (this.client?.getAccountModule as any)(...params)
      case 'getAccountResources':
        return (this.client?.getAccountResources as any)(...params)
      case 'getAccountResource':
        return (this.client?.getAccountResource as any)(...params)
      case 'generateTransaction':
        return (this.client?.generateTransaction as any)(...params)
      case 'getEventsByCreationNumber':
        return (this.client?.getEventsByCreationNumber as any)(...params)
      case 'getEventsByEventHandle':
        return (this.client?.getEventsByEventHandle as any)(...params)
      case 'submitTransaction':
        return (this.client?.submitTransaction as any)(...params)
      case 'simulateTransaction':
        return this.simulateTransaction(params[0], params[1])
      case 'submitSignedBCSTransaction':
        return (this.client?.submitSignedBCSTransaction as any)(...params)
      case 'submitBCSSimulation':
        return (this.client?.submitBCSSimulation as any)(...params)
      case 'getTransactions':
        return (this.client?.getTransactions as any)(...params)
      case 'getTransactionByHash':
        return (this.client?.getTransactionByHash as any)(...params)
      case 'getTransactionByVersion':
        return (this.client?.getTransactionByVersion as any)(...params)
      case 'transactionPending':
        return (this.client?.transactionPending as any)(...params)
      case 'waitForTransactionWithResult':
        return (this.client?.waitForTransactionWithResult as any)(...params)
      case 'waitForTransaction':
        return (this.client?.waitForTransaction as any)(...params)
      case 'getLedgerInfo':
        return (this.client?.getLedgerInfo as any)(...params)
      case 'getChainId':
        return (this.client?.getChainId as any)(...params)
      case 'getTableItem':
        return (this.client?.getTableItem as any)(...params)
      case 'generateRawTransaction':
        return (this.client?.generateRawTransaction as any)(...params)
      case 'estimateGasPrice':
        return (this.client?.estimateGasPrice as any)(...params)
      case 'estimateMaxGasAmount':
        return (this.client?.estimateMaxGasAmount as any)(...params)
      case 'lookupOriginalAddress':
        return (this.client?.lookupOriginalAddress as any)(...params)
      case 'getBlockByHeight':
        return (this.client?.getBlockByHeight as any)(...params)
      case 'getBlockByVersion':
        return (this.client?.getBlockByVersion as any)(...params)
      case 'clearCache':
        break

      // https://aptos-labs.github.io/ts-sdk-doc/classes/AptosClient.html
      // signing
      case 'signTransaction':
        // we do not allow signing offline transaction
        break
      case 'generateSignSubmitTransaction':
        return this.generateSignSubmitTransaction(ctx, params[0], params[1])
      case 'publishPackage':
        return this.publishPackage(ctx, params[0], params[1], params[2])
      case 'generateSignSubmitWaitForTransaction':
        return this.generateSignSubmitWaitForTransaction(
          ctx,
          params[0],
          params[1]
        )
      case 'rotateAuthKeyEd25519':
        // we do not allow rotating auth key by DApp
        break
    }

    throw ethErrors.rpc.methodNotSupported()
  }

  async connect(ctx: Context) {
    await this.requestAccounts(ctx)
  }

  async disconnect() {
    await this.disconnectConnectedAccounts()
  }

  async getActiveAccount() {
    if (!this.account) {
      throw ethErrors.provider.unauthorized()
    }
    const signingWallet = await getSigningWallet(this.account)
    return {
      address: this.account.address!,
      publicKey: signingWallet ? [signingWallet.publicKey] : []
    } as PublicAccount
  }

  async signAndSubmitTransaction(
    ctx: Context,
    payload: Types.TransactionPayload
  ) {
    if (!this.account?.address) {
      throw ethErrors.provider.unauthorized()
    }
    if (!isEntryFunctionPayload(payload)) {
      throw ethErrors.rpc.invalidRequest(
        'now only support entry function payload'
      )
    }

    const provider = new AptosProviderAdaptor(this.client)

    const { txParams, populatedParams } = await provider.populateTransaction(
      this.account,
      payload
    )

    const rawTransaction = await this.client.generateTransaction(
      HexString.ensure(this.account.address),
      txParams as Types.TransactionPayload_EntryFunctionPayload,
      populatedParams as Types.SubmitTransactionRequest
    )

    return this.sendTransaction(ctx, rawTransaction)
  }

  async generateSignSubmitTransaction(
    ctx: Context,
    payload: TxnBuilderTypes.TransactionPayload,
    extraArgs?: OptionalTransactionArgs
  ): Promise<string> {
    if (!this.account?.address) {
      throw ethErrors.provider.unauthorized()
    }

    const rawTransaction = await this.client.generateRawTransaction(
      HexString.ensure(this.account.address),
      payload,
      extraArgs
    )

    const response = await this.sendTransaction(ctx, rawTransaction)
    return response.hash
  }

  async publishPackage(
    ctx: Context,
    packageMetadata: BCS.Bytes,
    modules: BCS.Seq<TxnBuilderTypes.Module>,
    extraArgs?: OptionalTransactionArgs
  ): Promise<string> {
    const codeSerializer = new BCS.Serializer()
    BCS.serializeVector(modules, codeSerializer)

    const payload = new TxnBuilderTypes.TransactionPayloadEntryFunction(
      TxnBuilderTypes.EntryFunction.natural(
        '0x1::code',
        'publish_package_txn',
        [],
        [BCS.bcsSerializeBytes(packageMetadata), codeSerializer.getBytes()]
      )
    )

    return this.generateSignSubmitTransaction(ctx, payload, extraArgs)
  }

  async generateSignSubmitWaitForTransaction(
    ctx: Context,
    payload: TxnBuilderTypes.TransactionPayload,
    extraArgs?: OptionalTransactionArgs & {
      checkSuccess?: boolean
      timeoutSecs?: number
    }
  ): Promise<Types.Transaction> {
    const txnHash = await this.generateSignSubmitTransaction(
      ctx,
      payload,
      extraArgs
    )
    return this.client.waitForTransactionWithResult(txnHash, extraArgs)
  }

  private async sendTransaction(
    ctx: Context,
    rawTransaction: TxnBuilderTypes.RawTransaction
  ): Promise<Types.PendingTransaction> {
    assert(this.account)

    return CONSENT_SERVICE.requestConsent(
      {
        networkId: this.network.id,
        accountId: this.account.id,
        type: ConsentType.TRANSACTION,
        origin: this.origin,
        payload: { txParams: rawTransaction } as TransactionPayload
      },
      ctx
    )
  }

  async simulateTransaction(
    rawTransaction: TxnBuilderTypes.RawTransaction,
    query?: { estimateGasUnitPrice?: boolean; estimateMaxGasAmount?: boolean }
  ) {
    if (!this.account) {
      throw ethErrors.provider.unauthorized()
    }
    const signingWallet = await getSigningWallet(this.account)
    if (!signingWallet) {
      throw ethErrors.provider.unauthorized()
    }
    const aptosAccount = new FakeAptosAccount(
      HexString.ensure(signingWallet.publicKey)
    )
    return this.client.simulateTransaction(
      aptosAccount as unknown as AptosAccount,
      rawTransaction,
      query
    )
  }
}

// For single-signer account, there is one publicKey and minKeysRequired is null.
// For multi-signer account, there are multiple publicKeys and minKeysRequired value.
interface PublicAccount {
  address: string
  publicKey: string | string[]
  minKeysRequired?: number // for multi-signer account
}

class FakeAptosAccount {
  constructor(private publicKey: HexString) {}

  pubKey(): HexString {
    return this.publicKey
  }
}
