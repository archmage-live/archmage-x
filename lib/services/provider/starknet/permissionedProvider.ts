import { arrayify, hexlify, isHexString } from '@ethersproject/bytes'
import assert from 'assert'
import { ethErrors } from 'eth-rpc-errors'
import {
  AddStarknetChainParameters,
  SwitchStarknetChainParameter,
  WatchAssetParameters
} from 'get-starknet-core'
import {
  Abi,
  Call,
  DeclareContractResponse,
  DeclareContractTransaction,
  DeclareSignerDetails,
  DeployAccountContractPayload,
  DeployAccountSignerDetails,
  DeployContractResponse,
  Invocation,
  InvocationsDetailsWithNonce,
  InvocationsSignerDetails,
  InvokeFunctionResponse,
  SequencerProvider,
  Signature,
  TypedData,
  constants
} from 'starknet'

import { getActiveNetwork, getActiveNetworkByKind } from '~lib/active'
import { Context } from '~lib/inject/client'
import { NetworkKind } from '~lib/network'
import { StarknetChainInfo } from '~lib/network/starknet'
import { INetwork } from '~lib/schema'
import {
  CONSENT_SERVICE,
  ConsentRequest,
  ConsentType,
  SignTypedDataPayload
} from '~lib/services/consentService'
import { NETWORK_SERVICE } from '~lib/services/network'
import {
  StarknetClient,
  getStarknetClient
} from '~lib/services/provider/starknet/client'
import { checkAddress, getSigningWallet } from '~lib/wallet'

import { BasePermissionedProvider } from '../base'
import { StarknetProvider } from './provider'
import { StarknetTxParams } from './types'

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

  async request(ctx: Context, method: string, params: any[]): Promise<any> {
    try {
      switch (method) {
        case 'enable':
          return this.enable()
        case 'accounts':
          return this.getAccounts()
        case 'getPubKey':
          return await this.getPubKey()
        case 'invokeFunction':
          return await this.invokeFunction(ctx, params as any)
        case 'deployAccountContract':
          return await this.deployAccountContract(ctx, params as any)
        case 'declareContract':
          return await this.declareContract(ctx, params as any)
        case 'signMessage':
          return await this.signMessage(ctx, params as any)
        case 'signTransaction':
          return await this.signTransaction(ctx, params as any)
        case 'signDeployAccountTransaction':
          return await this.signDeployAccountTransaction(ctx, params as any)
        case 'signDeclareTransaction':
          return await this.signDeclareTransaction(ctx, params as any)
        case 'wallet_addStarknetChain':
          return await this.addChain(ctx, params[0])
        case 'wallet_switchStarknetChain':
          return await this.switchChain(ctx, params[0])
        case 'wallet_watchAsset':
          return await this.watchAsset(ctx, params[0])
      }
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  enable() {
    const info = this.network.info as StarknetChainInfo
    return {
      network: {
        chainId: info.shortName,
        baseUrl: info.baseUrl
      },
      addresses: this.getAccounts()
    }
  }

  getAccounts() {
    return this.account ? [this.account.address!] : []
  }

  async getPubKey(): Promise<string> {
    if (!this.account?.address) {
      throw ethErrors.provider.unauthorized()
    }

    const signer = await getSigningWallet(this.account)
    if (!signer?.publicKey) {
      throw ethErrors.provider.unauthorized()
    }

    return signer.publicKey
  }

  async signMessage(
    ctx: Context,
    [typedData, accountAddress]: [TypedData, string]
  ): Promise<string> {
    if (
      !this.account?.address ||
      this.account.address !==
        checkAddress(NetworkKind.STARKNET, accountAddress)
    ) {
      throw ethErrors.provider.unauthorized()
    }

    return await CONSENT_SERVICE.requestConsent(
      {
        networkId: this.network.id,
        accountId: this.account.id,
        type: ConsentType.SIGN_MSG,
        origin: this.origin,
        payload: {
          typedData
        } as SignTypedDataPayload
      } as any as ConsentRequest,
      ctx
    )
  }

  private async _signTransaction(
    ctx: Context,
    txParams: StarknetTxParams
  ): Promise<Signature> {
    if (!this.account?.address) {
      throw ethErrors.provider.unauthorized()
    }

    const provider = new StarknetProvider(this.client)

    const txPayload = await provider.populateTransaction(this.account, txParams)

    return await CONSENT_SERVICE.requestConsent(
      {
        networkId: this.network.id,
        accountId: this.account.id,
        type: ConsentType.TRANSACTION,
        origin: this.origin,
        payload: txPayload
      },
      ctx
    )
  }

  async signTransaction(
    ctx: Context,
    [transactions, transactionsDetail, abis]: [
      Call[],
      InvocationsSignerDetails,
      Abi[]
    ]
  ): Promise<Signature> {
    return this._signTransaction(ctx, {
      regularTx: [transactions, transactionsDetail, abis]
    })
  }

  async signDeployAccountTransaction(
    ctx: Context,
    [transaction]: [DeployAccountSignerDetails]
  ): Promise<Signature> {
    return this._signTransaction(ctx, {
      deployAccountTx: transaction
    })
  }

  async signDeclareTransaction(
    ctx: Context,
    [transaction]: [DeclareSignerDetails]
  ): Promise<Signature> {
    return this._signTransaction(ctx, {
      declareAccountTx: transaction
    })
  }

  async invokeFunction(
    ctx: Context,
    [invocation, details]: [Invocation, InvocationsDetailsWithNonce]
  ): Promise<InvokeFunctionResponse> {
    // TODO: db
    return this.client.invokeFunction(invocation, details)
  }

  async deployAccountContract(
    ctx: Context,
    [payload, details]: [
      DeployAccountContractPayload,
      InvocationsDetailsWithNonce
    ]
  ): Promise<DeployContractResponse> {
    // TODO: db
    return this.client.deployAccountContract(payload, details)
  }

  async declareContract(
    ctx: Context,
    [transaction, details]: [
      DeclareContractTransaction,
      InvocationsDetailsWithNonce
    ]
  ): Promise<DeclareContractResponse> {
    // TODO: db
    return this.client.declareContract(transaction, details)
  }

  async addChain(ctx: Context, params: AddStarknetChainParameters) {
    const chainId = this.checkChainId(params.chainId)

    const existing = await NETWORK_SERVICE.getNetwork({
      kind: NetworkKind.STARKNET,
      chainId
    })
    if (existing) {
      const activeNetwork = await getActiveNetwork()
      if (
        activeNetwork?.kind === NetworkKind.STARKNET &&
        existing.chainId === activeNetwork.chainId
      ) {
        return true
      }

      return this.switchChain(ctx, { chainId })
    }

    let baseUrl, rpcUrls, explorerUrls
    try {
      baseUrl = new URL(params.baseUrl).toString()

      rpcUrls = params.rpcUrls?.map((url) => new URL(url).toString())

      explorerUrls = (params.blockExplorerUrls ?? []).map((url) =>
        new URL(url).toString()
      )
    } catch (e: any) {
      throw ethErrors.rpc.invalidParams(e.toString())
    }

    if (!params.chainName.length) {
      throw ethErrors.rpc.invalidParams('Invalid chainName')
    }

    if (params.nativeCurrency) {
      const { address, name, symbol, decimals } = params.nativeCurrency
      if (
        !address?.length ||
        !name?.length ||
        !symbol?.length ||
        typeof decimals !== 'number' ||
        decimals <= 0
      ) {
        throw ethErrors.rpc.invalidParams('Invalid nativeCurrency')
      }
    }

    const info: StarknetChainInfo = {
      name: params.chainName,
      shortName: params.chainName,
      chainId,
      currency: {
        name: params.nativeCurrency?.name ?? 'Ether',
        symbol: params.nativeCurrency?.symbol ?? 'ETH',
        decimals: params.nativeCurrency?.decimals ?? 18,
        address: params.nativeCurrency?.address
      },
      baseUrl,
      rpcs: rpcUrls,
      explorers: explorerUrls,
      accountClassHash: [] // TODO
    }

    const client = new SequencerProvider({
      baseUrl: info.baseUrl,
      chainId: info.chainId as constants.StarknetChainId
    })
    if (params.chainId !== (await client.getChainId())) {
      throw ethErrors.rpc.invalidParams('Mismatched chainId')
    }

    await this._addChain(ctx, NetworkKind.STARKNET, chainId, info)
  }

  async switchChain(ctx: Context, params: SwitchStarknetChainParameter) {
    const chainId = this.checkChainId(params.chainId)
    await this._switchChain(ctx, NetworkKind.STARKNET, chainId)
    return true
  }

  private checkChainId(chainId: string) {
    if (!isHexString(chainId)) {
      throw ethErrors.rpc.invalidParams('Invalid chainId')
    }
    return hexlify(arrayify(chainId))
  }

  async watchAsset(ctx: Context, params: WatchAssetParameters) {
    if (!this.account?.address) {
      throw ethErrors.provider.unauthorized()
    }

    // TODO
  }
}
