import { Block, Transaction } from '@aleohq/sdk'
import { ethErrors } from 'eth-rpc-errors'
import PQueue from 'p-queue'

import { AleoNetworkInfo } from '~lib/network/aleo'
import { IChainAccount, INetwork } from '~lib/schema'
import { getSigningWallet } from '~lib/wallet'

import { Provider, TransactionPayload } from '../provider'
import { AleoNetworkClient } from './client'

export class AleoProvider implements Provider {
  client: AleoNetworkClient

  constructor(public network: INetwork) {
    this.client = new AleoNetworkClient(this.network)
  }

  static async from(network: INetwork) {
    return new AleoProvider(network)
  }

  async isOk(): Promise<boolean> {
    try {
      const info = this.network.info as AleoNetworkInfo
      const block = (await this.client.getLatestBlock()) as Block
      return block.header.metadata.network === info.networkId
    } catch {
      return false
    }
  }

  async isContract(address: string): Promise<boolean> {
    return false
  }

  async estimateGasPrice(account: IChainAccount): Promise<null> {
    return null
  }

  async estimateGas(account: IChainAccount, tx: any): Promise<null> {
    return null
  }

  async estimateGasFee(account: IChainAccount, tx: any): Promise<null> {
    return null
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
    // there's no nonce in Aleo
    return 0
  }

  getTypedData(typedData: any): Promise<any> {
    throw new Error('not implemented')
  }

  async populateTransaction(
    account: IChainAccount,
    tx: any
  ): Promise<TransactionPayload> {
    return {} as TransactionPayload
  }

  async signTransaction(account: IChainAccount) {}

  async sendTransaction(
    account: IChainAccount,
    transaction: Transaction | string
  ) {
    return (await this.client.sendTransaction(transaction)) as string
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
