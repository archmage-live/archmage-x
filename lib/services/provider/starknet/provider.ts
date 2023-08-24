import { ethErrors } from 'eth-rpc-errors'
import PQueue from 'p-queue'
import {
  Abi,
  Account,
  Call,
  Contract,
  DeclareSignerDetails,
  DeployAccountSignerDetails,
  InvocationsSignerDetails,
  Signature,
  SignerInterface,
  TransactionType,
  TypedData
} from 'starknet'

import { STARKNET_ETH_TOKEN_ADDRESS } from '~lib/network/starknet'
import { IChainAccount, INetwork } from '~lib/schema'
import { Provider, TransactionPayload } from '~lib/services/provider'
import { getSigningWallet } from '~lib/wallet'

import { StarknetClient, getStarknetClient } from './client'
import { StarknetTxParams } from './types'

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
    } catch (err) {
      console.error(err)
      return false
    }
  }

  async isContract(address: string): Promise<boolean> {
    const classHash = await this.client.getClassHashAt(address)
    return classHash.length > 0
  }

  estimateGasPrice(account: IChainAccount): Promise<any> {
    throw new Error('not implemented')
  }

  estimateGas(
    account: IChainAccount,
    txParams: StarknetTxParams
  ): Promise<string> {
    throw new Error('not implemented')
  }

  async estimateGasFee(
    account: IChainAccount,
    txParams: StarknetTxParams
  ): Promise<string> {
    const acc = new Account(this.client, account.address!, new VoidSigner())
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

    const { abi } = await this.client.getClassAt(STARKNET_ETH_TOKEN_ADDRESS)
    if (abi === undefined) {
      throw new Error('no abi')
    }
    const erc20 = new Contract(abi, STARKNET_ETH_TOKEN_ADDRESS, this.client)

    const balance = await erc20.balanceOf(address)
    return erc20.isCairo1() ? balance.toString() : balance.res.toString()
  }

  async getBalances(
    accountsOrAddresses: IChainAccount[] | string[]
  ): Promise<(string | undefined)[]> {
    const queue = new PQueue({ concurrency: 3 })
    return await queue.addAll(
      accountsOrAddresses.map((acc) => () => this.getBalance(acc))
    )
  }

  async getNextNonce(
    account: IChainAccount,
    tag?: string | number
  ): Promise<number> {
    return Number(this.client.getNonceForAddress(account.address!))
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

  sendTransaction(
    account: IChainAccount,
    signedTransaction: any
  ): Promise<any> {
    throw new Error('not implemented')
  }

  async signMessage(account: IChainAccount, message: any): Promise<any> {
    const signer = await getSigningWallet(account)
    if (!signer) {
      throw ethErrors.rpc.internal()
    }
    return signer.signMessage(message)
  }

  async signTransaction(
    account: IChainAccount,
    transaction: any,
    transactionsDetail: any
  ): Promise<any> {
    const signer = await getSigningWallet(account)
    if (!signer) {
      throw ethErrors.rpc.internal()
    }
    return signer.signTransaction(transaction, transactionsDetail)
  }

  async signTypedData(account: IChainAccount, typedData: any): Promise<any> {
    const signer = await getSigningWallet(account)
    if (!signer) {
      throw ethErrors.rpc.internal()
    }
    return signer.signTypedData(typedData)
  }

  async isSignable(account: IChainAccount): Promise<boolean> {
    return !!(await getSigningWallet(account))
  }
}

class VoidSigner implements SignerInterface {
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
