import assert from 'assert'
import { ethErrors } from 'eth-rpc-errors'
import PQueue from 'p-queue'
import {
  Abi,
  Account,
  Call,
  Contract,
  DeclareContractResponse,
  DeclareContractTransaction,
  DeclareSignerDetails,
  DeployAccountContractPayload,
  DeployAccountContractTransaction,
  DeployAccountSignerDetails,
  DeployContractResponse,
  Invocation,
  InvocationsSignerDetails,
  InvokeFunctionResponse,
  Signature,
  SignerInterface,
  TransactionType,
  TypedData,
  extractContractHashes,
  provider,
  transaction,
  uint256
} from 'starknet'

import { STARKNET_ETH_TOKEN_ADDRESS } from '~lib/network/starknet'
import erc20Abi from '~lib/network/starknet/abi/ERC20.json'
import { IChainAccount, INetwork } from '~lib/schema'
import { Provider, TransactionPayload } from '~lib/services/provider'
import { stringifyBigNumberish } from '~lib/utils'
import { getSigningWallet } from '~lib/wallet'

import { StarknetClient, getStarknetClient } from './client'
import { SignType, StarknetTxParams, StarknetTxPopulatedParams } from './types'

export class StarknetProvider implements Provider {
  constructor(public client: StarknetClient) {}

  static async from(network: INetwork) {
    const client = await getStarknetClient(network)
    return new StarknetProvider(client)
  }

  async isOk(): Promise<boolean> {
    try {
      await this.client.getBlock('latest')
      return true
    } catch {
      return false
    }
  }

  async isContract(address: string): Promise<boolean> {
    try {
      const classHash = await this.client.getClassHashAt(address)
      return classHash.length > 0
    } catch {
      return false
    }
  }

  async estimateGasPrice(account: IChainAccount): Promise<null> {
    return null
  }

  async estimateGas(account: IChainAccount): Promise<null> {
    return null
  }

  async estimateGasFee(
    account: IChainAccount,
    txParams: StarknetTxParams
  ): Promise<string> {
    const acc = new Account(
      this.client,
      account.address!,
      new StarknetVoidSigner()
    )
    let result
    switch (txParams.type) {
      case TransactionType.INVOKE: {
        result = await acc.estimateInvokeFee(txParams.payload, {
          nonce: txParams.details!.nonce,
          skipValidate: true
        })
        break
      }
      case TransactionType.DEPLOY_ACCOUNT: {
        result = await acc.estimateAccountDeployFee(txParams.payload, {
          skipValidate: true
        })
        break
      }
      case TransactionType.DECLARE: {
        result = await acc.estimateDeclareFee(txParams.payload, {
          skipValidate: true
        })
        break
      }
      default:
        throw new Error('no need to estimate gas')
    }

    return result.overall_fee.toString()
  }

  async getBalance(
    accountOrAddress: IChainAccount | string
  ): Promise<string | undefined> {
    const address =
      typeof accountOrAddress === 'object'
        ? accountOrAddress.address
        : accountOrAddress
    if (!address) {
      return
    }

    const erc20 = new Contract(
      erc20Abi,
      STARKNET_ETH_TOKEN_ADDRESS,
      this.client
    )

    const balance = await erc20.balanceOf(address)
    return uint256.uint256ToBN(balance.balance).toString()
  }

  async getBalances(
    accountsOrAddresses: IChainAccount[] | string[]
  ): Promise<(string | undefined)[]> {
    const queue = new PQueue({ concurrency: 3 })
    return await queue.addAll(
      accountsOrAddresses.map((acc) => () => this.getBalance(acc))
    )
  }

  async getNextNonce(account: IChainAccount): Promise<number> {
    return Number(await this.client.getNonceForAddress(account.address!))
  }

  getTypedData(typedData: any): Promise<any> {
    throw new Error('not implemented')
  }

  async populateTransaction(
    account: IChainAccount,
    transaction: any
  ): Promise<TransactionPayload> {
    throw new Error('not implemented')
  }

  async signTransaction(
    account: IChainAccount,
    txParams: StarknetTxParams,
    populatedParams: StarknetTxPopulatedParams
  ): Promise<
    | DeclareContractTransaction
    | DeployAccountContractTransaction
    | Invocation
    | Signature
  > {
    const signer = await getSigningWallet(account)
    if (!signer) {
      throw ethErrors.rpc.internal()
    }

    switch (txParams.type) {
      case TransactionType.DECLARE: {
        assert(populatedParams.type === TransactionType.DECLARE)
        const signature = await signer.signTransaction(populatedParams.details)
        const { contract, compiledClassHash } = extractContractHashes(
          txParams.payload
        )
        const compressedCompiledContract = provider.parseContract(contract)
        return stringifyBigNumberish({
          senderAddress: account.address!.toLowerCase(),
          signature,
          contract: compressedCompiledContract,
          compiledClassHash
        } as DeclareContractTransaction)
      }
      case TransactionType.DEPLOY_ACCOUNT: {
        assert(populatedParams.type === TransactionType.DEPLOY_ACCOUNT)
        const signature = await signer.signTransaction(populatedParams.details)
        return stringifyBigNumberish({
          classHash: txParams.payload.classHash,
          constructorCalldata: txParams.payload.constructorCalldata,
          addressSalt: txParams.payload.addressSalt,
          signature
        } as DeployAccountContractTransaction)
      }
      case TransactionType.INVOKE: {
        assert(populatedParams.type === TransactionType.INVOKE)
        const signature = await signer.signTransaction(
          txParams.payload,
          populatedParams.details
        )
        const calldata = transaction.getExecuteCalldata(
          txParams.payload,
          populatedParams.details.cairoVersion
        )
        return stringifyBigNumberish({
          contractAddress: account.address!.toLowerCase(),
          calldata,
          signature
        } as Invocation)
      }
      case SignType.DECLARE: {
        assert(populatedParams.type === SignType.DECLARE)
        return await signer.signTransaction(txParams.details)
      }
      case SignType.DEPLOY_ACCOUNT: {
        assert(populatedParams.type === SignType.DEPLOY_ACCOUNT)
        return await signer.signTransaction(txParams.details)
      }
      case SignType.INVOKE: {
        assert(populatedParams.type === SignType.INVOKE)
        return await signer.signTransaction(
          txParams.details[0],
          txParams.details[1]
        )
      }
    }
  }

  async sendTransaction(
    account: IChainAccount,
    signedTransaction:
      | DeclareContractTransaction
      | DeployAccountContractTransaction
      | Invocation,
    txParams: StarknetTxParams,
    populatedParams: StarknetTxPopulatedParams
  ): Promise<
    DeclareContractResponse | DeployContractResponse | InvokeFunctionResponse
  > {
    switch (txParams.type) {
      case TransactionType.DECLARE: {
        assert(populatedParams.type === TransactionType.DECLARE)
        return await this.client.declareContract(
          signedTransaction as DeclareContractTransaction,
          populatedParams.details
        )
      }
      case TransactionType.DEPLOY_ACCOUNT: {
        assert(populatedParams.type === TransactionType.DEPLOY_ACCOUNT)
        return await this.client.deployAccountContract(
          signedTransaction as DeployAccountContractTransaction,
          populatedParams.details
        )
      }
      case TransactionType.INVOKE: {
        assert(populatedParams.type === TransactionType.INVOKE)
        return await this.client.invokeFunction(
          signedTransaction as Invocation,
          populatedParams.details
        )
      }
      default:
        throw new Error('invalid starknet tx type')
    }
  }

  async signMessage(account: IChainAccount, message: any): Promise<any> {
    const signer = await getSigningWallet(account)
    if (!signer) {
      throw ethErrors.rpc.internal()
    }
    return signer.signMessage(message)
  }

  async signTypedData(account: IChainAccount, typedData: any): Promise<any> {
    const signer = await getSigningWallet(account)
    if (!signer) {
      throw ethErrors.rpc.internal()
    }
    return stringifyBigNumberish(await signer.signTypedData(typedData))
  }

  async isSignable(account: IChainAccount): Promise<boolean> {
    return !!(await getSigningWallet(account))
  }
}

export class StarknetVoidSigner implements SignerInterface {
  getPubKey(): Promise<string> {
    return Promise.resolve('')
  }

  async signDeclareTransaction(
    transaction: DeclareSignerDetails
  ): Promise<Signature> {
    return []
  }

  async signDeployAccountTransaction(
    transaction: DeployAccountSignerDetails
  ): Promise<Signature> {
    return []
  }

  async signMessage(
    typedData: TypedData,
    accountAddress: string
  ): Promise<Signature> {
    return []
  }

  async signTransaction(
    transactions: Call[],
    transactionsDetail: InvocationsSignerDetails,
    abis?: Abi[]
  ): Promise<Signature> {
    return []
  }
}
