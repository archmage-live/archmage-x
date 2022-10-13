import { AptosClient, TxnBuilderTypes, Types } from 'aptos'
import assert from 'assert'
import { ethErrors } from 'eth-rpc-errors'

import { IChainAccount, INetwork } from '~lib/schema'
import { ProviderAdaptor, TransactionPayload } from '~lib/services/provider'
import { getSigningWallet } from '~lib/wallet'

import { getAptosClient } from './client'
import { SignMessageResponse } from './types'

export const DEFAULT_MAX_GAS_AMOUNT = 20000
export const DEFAULT_TXN_EXP_SEC_FROM_NOW = 20

export class AptosProviderAdaptor implements ProviderAdaptor {
  constructor(public client: AptosClient) {}

  static async from(network: INetwork) {
    const client = await getAptosClient(network)
    assert(client)
    return new AptosProviderAdaptor(client)
  }

  estimateGas(account: IChainAccount, tx: any): Promise<string> {
    return Promise.resolve('')
  }

  estimateGasPrice(): Promise<any> {
    return Promise.resolve(undefined)
  }

  estimateSendGas(account: IChainAccount, to: string): Promise<string> {
    return Promise.resolve('')
  }

  getBalance(address: string): Promise<string> {
    return Promise.resolve('')
  }

  getBalances(address: string[]): Promise<string[] | undefined> {
    return Promise.resolve(undefined)
  }

  getTransactions(address: string): Promise<any> {
    return Promise.resolve(undefined)
  }

  getTypedData(typedData: any): Promise<any> {
    return Promise.resolve(undefined)
  }

  isContract(address: string): Promise<boolean> {
    return Promise.resolve(false)
  }

  isOk(): Promise<boolean> {
    return Promise.resolve(false)
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
