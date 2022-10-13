import {
  AptosAccount,
  AptosClient,
  CoinClient,
  HexString,
  TxnBuilderTypes,
  Types
} from 'aptos'
import assert from 'assert'
import { ethErrors } from 'eth-rpc-errors'
import PQueue from 'p-queue'

import { IChainAccount, INetwork } from '~lib/schema'
import { ProviderAdaptor, TransactionPayload } from '~lib/services/provider'
import { getSigningWallet } from '~lib/wallet'

import { getAptosClient } from './client'
import {
  FakeAptosAccount,
  SignMessageResponse,
  isEntryFunctionPayload
} from './types'

export const DEFAULT_MAX_GAS_AMOUNT = 20000
export const DEFAULT_TXN_EXP_SEC_FROM_NOW = 20

export class AptosProviderAdaptor implements ProviderAdaptor {
  constructor(public client: AptosClient) {}

  static async from(network: INetwork) {
    const client = await getAptosClient(network)
    assert(client)
    return new AptosProviderAdaptor(client)
  }

  async simulateTransaction(
    account: IChainAccount,
    rawTransaction: TxnBuilderTypes.RawTransaction,
    query?: {
      estimateGasUnitPrice?: boolean
      estimateMaxGasAmount?: boolean
    }
  ): Promise<Types.UserTransaction[]> {
    const signingWallet = await getSigningWallet(account)
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

  async estimateGasPrice(): Promise<number> {
    const estimation = await this.client.estimateGasPrice()
    return estimation.gas_estimate
  }

  async estimateGas(
    account: IChainAccount,
    payload: Types.TransactionPayload
  ): Promise<string> {
    assert(isEntryFunctionPayload(payload))

    const { txParams, populatedParams } = await this.populateTransaction(
      account,
      payload
    )

    const rawTransaction = await this.client.generateTransaction(
      HexString.ensure(account.address!),
      txParams as Types.TransactionPayload_EntryFunctionPayload,
      populatedParams as Types.SubmitTransactionRequest
    )

    const response = await this.simulateTransaction(account, rawTransaction, {
      estimateGasUnitPrice: true,
      estimateMaxGasAmount: true
    })

    return response[0].max_gas_amount
  }

  async getBalance(address: string): Promise<string> {
    const account = new AptosAccount(undefined, address)
    const balance = await new CoinClient(this.client).checkBalance(account)
    return balance.toString()
  }

  async getBalances(addresses: string[]): Promise<string[] | undefined> {
    // TODO: retry when error
    const queue = new PQueue({ concurrency: 3 })
    return await queue.addAll(
      addresses.map((addr) => () => this.getBalance(addr))
    )
  }

  getTypedData(typedData: any): Promise<any> {
    throw new Error('not implemented')
  }

  isContract(address: string): Promise<boolean> {
    throw new Error('not implemented')
  }

  async isOk(): Promise<boolean> {
    try {
      await this.client.getLedgerInfo()
      return true
    } catch (err) {
      console.error(err)
      return false
    }
  }

  async populateTransaction(
    account: IChainAccount,
    transaction: Types.TransactionPayload
  ): Promise<TransactionPayload> {
    // TODO
    const { sequence_number: sequenceNumber } = await this.client.getAccount(
      account.address!
    )

    const { gas_estimate: gasEstimate } = await this.client.estimateGasPrice()

    const expireTimestamp =
      Math.floor(Date.now() / 1000) + DEFAULT_TXN_EXP_SEC_FROM_NOW

    return {
      txParams: transaction,
      populatedParams: {
        max_gas_amount: DEFAULT_MAX_GAS_AMOUNT.toString(),
        gas_unit_price: gasEstimate.toString(),
        expiration_timestamp_secs: expireTimestamp.toString(),
        sequence_number: sequenceNumber
      } as Types.SubmitTransactionRequest
    } as TransactionPayload
  }

  async signTransaction(
    account: IChainAccount,
    transaction: TxnBuilderTypes.RawTransaction
  ): Promise<Uint8Array> {
    const signer = await getSigningWallet(account)
    if (!signer) {
      throw ethErrors.rpc.internal()
    }
    return signer.signTransaction(transaction)
  }

  async sendTransaction(
    signedTransaction: Uint8Array
  ): Promise<Types.PendingTransaction> {
    return await this.client.submitSignedBCSTransaction(signedTransaction)
  }

  signMessage(account: IChainAccount, message: any): Promise<any> {
    throw new Error('not implemented')
  }

  async signTypedData(
    account: IChainAccount,
    typedData: SignMessageResponse
  ): Promise<string> {
    const signer = await getSigningWallet(account)
    if (!signer) {
      throw ethErrors.rpc.internal()
    }
    return signer.signTypedData(typedData.fullMessage)
  }
}
