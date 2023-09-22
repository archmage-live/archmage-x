import { arrayify, hexlify } from '@ethersproject/bytes'
import {
  ApiError,
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
import { Provider, TransactionPayload, getNonce } from '~lib/services/provider'
import { getSigningWallet } from '~lib/wallet'

import { getAptosClient } from './client'
import { SignMessageResponse, isAptosEntryFunctionPayload } from './types'

export const DEFAULT_MAX_GAS_AMOUNT = 20000
export const DEFAULT_TXN_EXP_SEC_FROM_NOW = 20

export class AptosProvider implements Provider {
  constructor(public client: AptosClient) {}

  static async from(network: INetwork) {
    const client = await getAptosClient(network)
    assert(client)
    return new AptosProvider(client)
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

  isContract(address: string): Promise<boolean> {
    throw new Error('not implemented')
  }

  async getNextNonce(
    account: IChainAccount,
    tag?: string | number
  ): Promise<number> {
    const { sequence_number: sequenceNumber } = await this.client.getAccount(
      account.address!
    )
    return +sequenceNumber
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
    const account = new AptosAccount(undefined, address)
    try {
      const balance = await new CoinClient(this.client).checkBalance(account)
      return balance.toString()
    } catch (e) {
      if (
        e instanceof ApiError &&
        e.errorCode === Types.AptosErrorCode.ACCOUNT_NOT_FOUND
      ) {
        return '0'
      }
      throw e
    }
  }

  async getBalances(
    accountsOrAddresses: IChainAccount[] | string[]
  ): Promise<(string | undefined)[]> {
    const queue = new PQueue({ concurrency: 3 })
    return await queue.addAll(
      accountsOrAddresses.map((acc) => () => this.getBalance(acc))
    )
  }

  async estimateGasPrice(account: IChainAccount): Promise<number> {
    const estimation = await this.client.estimateGasPrice()
    return estimation.gas_estimate
  }

  async estimateGas(
    account: IChainAccount,
    payload: Types.TransactionPayload
  ): Promise<string> {
    assert(isAptosEntryFunctionPayload(payload))

    const { populatedParams: userTx } = await this.populateTransaction(
      account,
      payload
    )

    return (userTx as Types.UserTransaction).max_gas_amount
  }

  async estimateGasFee(account: IChainAccount, tx: any): Promise<null> {
    return null
  }

  async simulateTransaction(
    account: IChainAccount,
    rawTransaction: TxnBuilderTypes.RawTransaction,
    query?: {
      estimateGasUnitPrice?: boolean
      estimateMaxGasAmount?: boolean
      estimatePrioritizedGasUnitPrice: boolean
    }
  ): Promise<Types.UserTransaction[]> {
    const signingWallet = await getSigningWallet(account)
    if (!signingWallet?.publicKey) {
      throw ethErrors.provider.unauthorized()
    }
    return this.client.simulateTransaction(
      new TxnBuilderTypes.Ed25519PublicKey(
        HexString.ensure(signingWallet.publicKey).toUint8Array()
      ),
      rawTransaction,
      query
    )
  }

  async populateTransaction(
    account: IChainAccount,
    transaction: Types.TransactionPayload | TxnBuilderTypes.RawTransaction
  ): Promise<TransactionPayload> {
    let rawTransaction
    if (transaction instanceof TxnBuilderTypes.RawTransaction) {
      rawTransaction = transaction
    } else {
      assert(isAptosEntryFunctionPayload(transaction))

      const { gas_estimate: gasEstimate } = await this.client.estimateGasPrice()

      const sequenceNumber = await getNonce(this, account)

      const expireTimestamp =
        Math.floor(Date.now() / 1000) + DEFAULT_TXN_EXP_SEC_FROM_NOW

      rawTransaction = await this.client.generateTransaction(
        HexString.ensure(account.address!),
        transaction as Types.TransactionPayload_EntryFunctionPayload,
        {
          max_gas_amount: DEFAULT_MAX_GAS_AMOUNT.toString(),
          gas_unit_price: gasEstimate.toString(),
          expiration_timestamp_secs: expireTimestamp.toString(),
          sequence_number: sequenceNumber.toString()
        } as Types.SubmitTransactionRequest
      )
    }

    const userTxs = await this.simulateTransaction(account, rawTransaction, {
      estimateGasUnitPrice: false,
      estimateMaxGasAmount: true,
      estimatePrioritizedGasUnitPrice: false
    })

    return {
      txParams: rawTransaction,
      populatedParams: userTxs[0]
    } as TransactionPayload
  }

  async signTransaction(
    account: IChainAccount,
    transaction: TxnBuilderTypes.RawTransaction
  ): Promise<string> {
    const signer = await getSigningWallet(account)
    if (!signer) {
      throw ethErrors.rpc.internal()
    }
    return hexlify(await signer.signTransaction(transaction))
  }

  async sendTransaction(
    account: IChainAccount,
    signedTransaction: string
  ): Promise<Types.PendingTransaction> {
    const pendingTx = await this.client.submitSignedBCSTransaction(
      arrayify(signedTransaction)
    )
    delete (pendingTx as any).__headers
    return pendingTx
  }

  signMessage(account: IChainAccount, message: any): Promise<any> {
    throw new Error('not implemented')
  }

  getTypedData(typedData: any): Promise<any> {
    throw new Error('not implemented')
  }

  async signTypedData(
    account: IChainAccount,
    typedData: SignMessageResponse
  ): Promise<SignMessageResponse> {
    const signer = await getSigningWallet(account)
    if (!signer) {
      throw ethErrors.rpc.internal()
    }
    typedData.signature = (
      await signer.signTypedData(typedData.fullMessage)
    ).slice(2)
    return typedData
  }

  async isSignable(account: IChainAccount): Promise<boolean> {
    return !!(await getSigningWallet(account))
  }
}
