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
  Account,
  AllowArray,
  CairoVersion,
  Call,
  CallData,
  DeclareAndDeployContractPayload,
  DeclareContractPayload,
  DeclareContractResponse,
  DeclareDeployUDCResponse,
  DeclareSignerDetails,
  DeployAccountContractPayload,
  DeployAccountSignerDetails,
  DeployContractResponse,
  DeployContractUDCResponse,
  Details,
  EstimateFeeAction,
  EstimateFeeDetails,
  InvocationsDetails,
  InvocationsSignerDetails,
  InvokeFunctionResponse,
  MultiDeployContractResponse,
  SequencerProvider,
  Signature,
  TransactionType,
  TypedData,
  UniversalDeployerContractPayload,
  constants,
  extractContractHashes,
  hash,
  isSierra
} from 'starknet'

import { getActiveNetwork, getActiveNetworkByKind } from '~lib/active'
import { Context } from '~lib/inject/client'
import { NetworkKind } from '~lib/network'
import { StarknetChainInfo } from '~lib/network/starknet'
import { IChainAccount, INetwork } from '~lib/schema'
import {
  CONSENT_SERVICE,
  ConsentRequest,
  ConsentType,
  SignTypedDataPayload
} from '~lib/services/consentService'
import { NETWORK_SERVICE } from '~lib/services/network'
import { formatTxPayload, getNonce } from '~lib/services/provider'
import {
  StarknetClient,
  getStarknetClient
} from '~lib/services/provider/starknet/client'
import { checkAddress, getSigningWallet } from '~lib/wallet'

import { BasePermissionedProvider } from '../base'
import { StarknetProvider, StarknetVoidSigner } from './provider'
import { SignType, StarknetTransactionPayload } from './types'

const transactionVersion = 1
const transactionVersion_2 = 2

export class StarknetPermissionedProvider extends BasePermissionedProvider {
  cairoVersion: CairoVersion = '0' // TODO

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
          return await this.enable(ctx)
        case 'accounts':
          return this.getAccounts()
        case 'getPubKey':
          return await this.getPubKey()

        case 'execute':
          return await this.execute(
            ctx,
            params.at(0),
            params.at(1),
            params.at(2)
          )
        case 'deployAccount':
          return await this.deployAccount(ctx, params.at(0), params.at(1))
        case 'declare':
          return await this.declare(ctx, params.at(0), params.at(1))

        case 'signTransaction':
          return await this.signTransaction(
            ctx,
            params.at(0),
            params.at(1),
            params.at(2)
          )
        case 'signDeployAccountTransaction':
          return await this.signDeployAccountTransaction(ctx, params.at(0))
        case 'signDeclareTransaction':
          return await this.signDeclareTransaction(ctx, params.at(0))

        case 'signMessage':
          return await this.signMessage(ctx, params.at(0), params.at(1))

        case 'wallet_addStarknetChain':
          return await this.addChain(ctx, params[0])
        case 'wallet_switchStarknetChain':
          return await this.switchChain(ctx, params[0])
        case 'wallet_watchAsset':
          return await this.watchAsset(ctx, params[0])
        default:
          throw Error('Not implemented')
      }
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  async enable(ctx: Context) {
    await this.requestAccounts(ctx)

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
    typedData: TypedData,
    accountAddress: string
  ): Promise<Signature> {
    if (
      !this.account?.address ||
      this.account.address !==
        checkAddress(NetworkKind.STARKNET, accountAddress)
    ) {
      throw ethErrors.provider.unauthorized()
    }

    const { chainId, name, version, verifyingContract } = typedData.domain

    if (
      !chainId ||
      chainId !== (this.network.info as StarknetChainInfo).shortName
    ) {
      throw ethErrors.rpc.invalidParams('Mismatched chainId')
    }

    return await CONSENT_SERVICE.requestConsent(
      {
        networkId: this.network.id,
        accountId: this.account.id,
        type: ConsentType.SIGN_TYPED_DATA,
        origin: this.origin,
        payload: {
          metadata: [
            ['Name', name],
            ['Version', version],
            ['Contract', verifyingContract]
          ],
          typedData
        } as SignTypedDataPayload
      } as any as ConsentRequest,
      ctx
    )
  }

  private async _signTransaction(
    ctx: Context,
    type: ConsentType.TRANSACTION | ConsentType.SIGN_TRANSACTION,
    payload: StarknetTransactionPayload
  ): Promise<any> {
    if (!this.account?.address) {
      throw ethErrors.provider.unauthorized()
    }

    return await CONSENT_SERVICE.requestConsent(
      {
        networkId: this.network.id,
        accountId: this.account.id,
        type,
        origin: this.origin,
        payload: formatTxPayload(this.network, payload)
      },
      ctx
    )
  }

  async signTransaction(
    ctx: Context,
    transactions: Call[],
    transactionsDetail: InvocationsSignerDetails,
    abis: Abi[]
  ): Promise<Signature> {
    // ignore abis
    return this._signTransaction(ctx, ConsentType.SIGN_TRANSACTION, {
      txParams: {
        type: SignType.INVOKE,
        details: [transactions, transactionsDetail]
      },
      populatedParams: {
        type: SignType.INVOKE
      }
    })
  }

  async signDeployAccountTransaction(
    ctx: Context,
    transaction: DeployAccountSignerDetails
  ): Promise<Signature> {
    return this._signTransaction(ctx, ConsentType.SIGN_TRANSACTION, {
      txParams: {
        type: SignType.DEPLOY_ACCOUNT,
        details: transaction
      },
      populatedParams: {
        type: SignType.DEPLOY_ACCOUNT
      }
    })
  }

  async signDeclareTransaction(
    ctx: Context,
    transaction: DeclareSignerDetails
  ): Promise<Signature> {
    return this._signTransaction(ctx, ConsentType.SIGN_TRANSACTION, {
      txParams: {
        type: SignType.DECLARE,
        details: transaction
      },
      populatedParams: {
        type: SignType.DECLARE
      }
    })
  }

  private async _getSuggestedMaxFee(
    account: IChainAccount,
    action: EstimateFeeAction,
    details: EstimateFeeDetails
  ) {
    const acc = new Account(
      this.client,
      account.address!,
      new StarknetVoidSigner()
    )
    return acc.getSuggestedMaxFee(action, {
      ...details,
      skipValidate: true
    })
  }

  async execute(
    ctx: Context,
    calls: AllowArray<Call>,
    abis?: Abi[],
    transactionsDetail?: InvocationsDetails
  ): Promise<InvokeFunctionResponse> {
    if (!this.account?.address) {
      throw ethErrors.provider.unauthorized()
    }

    transactionsDetail = transactionsDetail ?? {}

    const provider = new StarknetProvider(this.client)

    const transactions = Array.isArray(calls) ? calls : [calls]
    const nonce =
      transactionsDetail.nonce ?? (await getNonce(provider, this.account))
    const maxFee =
      transactionsDetail.maxFee ??
      (await this._getSuggestedMaxFee(
        this.account,
        { type: TransactionType.INVOKE, payload: calls },
        transactionsDetail
      ))
    const version = transactionVersion
    const chainId = this.network.chainId as constants.StarknetChainId

    const signerDetails: InvocationsSignerDetails = {
      walletAddress: this.account.address,
      nonce,
      maxFee,
      version,
      chainId,
      cairoVersion: this.cairoVersion
    }

    return this._signTransaction(ctx, ConsentType.TRANSACTION, {
      txParams: {
        type: TransactionType.INVOKE,
        payload: transactions,
        details: transactionsDetail
      },
      populatedParams: {
        type: TransactionType.INVOKE,
        details: signerDetails
      }
    })
  }

  async declare(
    ctx: Context,
    payload: DeclareContractPayload,
    transactionsDetail?: InvocationsDetails
  ): Promise<DeclareContractResponse> {
    if (!this.account?.address) {
      throw ethErrors.provider.unauthorized()
    }

    transactionsDetail = transactionsDetail ?? {}

    const declareContractPayload = extractContractHashes(payload)
    const details = {} as Details

    details.nonce =
      transactionsDetail.nonce ??
      (await getNonce(new StarknetProvider(this.client), this.account))
    details.maxFee =
      transactionsDetail.maxFee ??
      (await this._getSuggestedMaxFee(
        this.account,
        {
          type: TransactionType.DECLARE,
          payload: declareContractPayload
        },
        transactionsDetail
      ))
    details.version = !isSierra(payload.contract)
      ? transactionVersion
      : transactionVersion_2
    const chainId = this.network.chainId as constants.StarknetChainId

    const { classHash, compiledClassHash } = declareContractPayload

    return this._signTransaction(ctx, ConsentType.TRANSACTION, {
      txParams: {
        type: TransactionType.DECLARE,
        payload,
        details: transactionsDetail
      },
      populatedParams: {
        type: TransactionType.DECLARE,
        details: {
          classHash,
          compiledClassHash,
          senderAddress: this.account.address,
          chainId,
          maxFee: details.maxFee,
          version: details.version,
          nonce: details.nonce
        }
      }
    })
  }

  async deploy(
    ctx: Context,
    payload:
      | UniversalDeployerContractPayload
      | UniversalDeployerContractPayload[],
    details?: InvocationsDetails | undefined
  ): Promise<MultiDeployContractResponse> {
    // NOTE: no need to implement
    throw new Error('not implemented')
  }

  async deployContract(
    ctx: Context,
    payload:
      | UniversalDeployerContractPayload
      | UniversalDeployerContractPayload[],
    details?: InvocationsDetails | undefined
  ): Promise<DeployContractUDCResponse> {
    // NOTE: no need to implement
    throw new Error('not implemented')
  }

  async declareAndDeploy(
    ctx: Context,
    payload: DeclareAndDeployContractPayload,
    details?: InvocationsDetails | undefined
  ): Promise<DeclareDeployUDCResponse> {
    // NOTE: no need to implement
    throw new Error('not implemented')
  }

  async deployAccount(
    ctx: Context,
    contractPayload: DeployAccountContractPayload,
    transactionsDetail?: InvocationsDetails
  ): Promise<DeployContractResponse> {
    if (!this.account?.address) {
      throw ethErrors.provider.unauthorized()
    }

    contractPayload.addressSalt = contractPayload.addressSalt ?? 0
    contractPayload.constructorCalldata =
      contractPayload.constructorCalldata ?? []
    transactionsDetail = transactionsDetail ?? {}

    const version = transactionVersion
    const nonce = 0 // DEPLOY_ACCOUNT transaction will have a nonce zero as it is the first transaction in the account
    const chainId = this.network.chainId as constants.StarknetChainId

    const compiledCalldata = CallData.compile(
      contractPayload.constructorCalldata
    )
    const contractAddress =
      contractPayload.contractAddress ??
      hash.calculateContractAddressFromHash(
        contractPayload.addressSalt,
        contractPayload.classHash,
        compiledCalldata,
        0
      )

    const maxFee =
      transactionsDetail?.maxFee ??
      (await this._getSuggestedMaxFee(
        this.account,
        {
          type: TransactionType.DEPLOY_ACCOUNT,
          payload: {
            classHash: contractPayload.classHash,
            constructorCalldata: compiledCalldata,
            addressSalt: contractPayload.addressSalt,
            contractAddress
          }
        },
        transactionsDetail
      ))

    return this._signTransaction(ctx, ConsentType.TRANSACTION, {
      txParams: {
        type: TransactionType.DEPLOY_ACCOUNT,
        payload: contractPayload,
        details: transactionsDetail
      },
      populatedParams: {
        type: TransactionType.DEPLOY_ACCOUNT,
        details: {
          classHash: contractPayload.classHash,
          constructorCalldata: compiledCalldata,
          contractAddress,
          addressSalt: contractPayload.addressSalt,
          chainId,
          maxFee,
          version,
          nonce
        }
      }
    })
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
