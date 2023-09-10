import type { SuiTransactionBlockResponse } from '@mysten/sui.js/client'
import type { TransactionBlock } from '@mysten/sui.js/transactions'
import { ethErrors } from 'eth-rpc-errors'
import PQueue from 'p-queue'

import { IChainAccount, INetwork } from '~lib/schema'
import { SignatureWithBytes, getSigningWallet } from '~lib/wallet'

import { Provider, TransactionPayload } from '../provider'
import { SuiClient, getSuiClient } from './client'

export class SuiProvider implements Provider {
  constructor(public client: SuiClient) {}

  static async from(network: INetwork) {
    const client = await getSuiClient(network)
    return new SuiProvider(client)
  }

  async isOk(): Promise<boolean> {
    try {
      await this.client.getChainIdentifier()
      return true
    } catch {
      return false
    }
  }

  async isContract(address: string): Promise<boolean> {
    throw new Error('not implemented')
  }

  async estimateGasPrice(account: IChainAccount): Promise<string> {
    throw new Error('not implemented')
  }

  async estimateGas(account: IChainAccount): Promise<string> {
    throw new Error('not implemented')
  }

  async estimateGasFee(
    account: IChainAccount,
    txParams: TransactionBlock
  ): Promise<string> {
    throw new Error('not implemented')
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

    const balance = await this.client.getBalance({
      owner: address
    })

    return balance.totalBalance
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
    // there's no nonce in Sui
    return 0
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
    txParams: TransactionBlock
  ): Promise<SignatureWithBytes> {
    const signer = await getSigningWallet(account)
    if (!signer) {
      throw ethErrors.rpc.internal()
    }

    return signer.signTransaction(await txParams.build({ client: this.client }))
  }

  async sendTransaction(
    account: IChainAccount,
    signedTransaction: SignatureWithBytes
  ): Promise<SuiTransactionBlockResponse> {
    return this.client.executeTransactionBlock({
      transactionBlock: signedTransaction.bytes,
      signature: signedTransaction.signature,
      requestType: 'WaitForLocalExecution',
      options: {
        showBalanceChanges: true,
        showEffects: true,
        showEvents: true,
        showInput: true,
        showObjectChanges: true,
        showRawInput: true
      }
    })
  }

  async signMessage(account: IChainAccount, message: any): Promise<any> {
    const signer = await getSigningWallet(account)
    if (!signer) {
      throw ethErrors.rpc.internal()
    }
    return signer.signMessage(message)
  }

  async signTypedData(account: IChainAccount, typedData: any): Promise<any> {
    throw new Error('not implemented')
  }

  async isSignable(account: IChainAccount): Promise<boolean> {
    return !!(await getSigningWallet(account))
  }
}
