import { PublicKey, Transaction } from '@solana/web3.js'
import { ethErrors } from 'eth-rpc-errors'

import { IChainAccount, INetwork } from '~lib/schema'
import { Provider, TransactionPayload } from '~lib/services/provider'
import { getSigningWallet } from '~lib/wallet'

import { SolanaClient, getSolanaClient } from './client'

export class SolanaProvider implements Provider {
  constructor(public client: SolanaClient) {}

  static async from(network: INetwork) {
    const client = getSolanaClient(network)
    return new SolanaProvider(client)
  }

  async isOk(): Promise<boolean> {
    try {
      await this.client.getSlot()
      return true
    } catch {
      return false
    }
  }

  async isContract(address: string): Promise<boolean> {
    const rep = await this.client.getAccountInfo(new PublicKey(address))
    return rep?.executable || false
  }

  async estimateGasPrice(account: IChainAccount): Promise<null> {
    return null
  }

  async estimateGas(account: IChainAccount): Promise<null> {
    return null
  }

  async estimateGasFee(
    account: IChainAccount,
    tx: Transaction
  ): Promise<string | null> {
    return (await tx.getEstimatedFee(this.client))?.toString() || null
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

    return (await this.client.getBalance(new PublicKey(address))).toString()
  }

  async getBalances(
    accountsOrAddresses: IChainAccount[] | string[]
  ): Promise<(string | undefined)[]> {
    const addresses = accountsOrAddresses
      .map((acc) => (typeof acc === 'object' ? acc.address : acc))
      .filter((addr) => !!addr) as string[]

    const accountsInfo = await this.client.getMultipleAccountsInfo(
      addresses.map((addr) => new PublicKey(addr))
    )

    const balancesMap = new Map<string, string>()
    addresses.forEach((addr, i) => {
      const accInfo = accountsInfo[i]
      if (accInfo) {
        balancesMap.set(addr, accInfo.lamports.toString())
      }
    })

    return accountsOrAddresses
      .map((acc) => (typeof acc === 'object' ? acc.address : acc))
      .map((addr) => (addr ? balancesMap.get(addr) : undefined))
  }

  async getNextNonce(account: IChainAccount): Promise<number> {
    // there's no nonce in Solana
    return 0
  }

  getTypedData(typedData: any): Promise<any> {
    throw new Error('not implemented')
  }

  async populateTransaction(
    account: IChainAccount,
    tx: any
  ): Promise<TransactionPayload> {
    return {
      txParams: tx,
      populatedParams: undefined
    }
  }

  async signTransaction(
    account: IChainAccount,
    txParams: Transaction
  ): Promise<Transaction> {
    const signer = await getSigningWallet(account)
    if (!signer) {
      throw ethErrors.rpc.internal()
    }

    return signer.signTransaction(txParams)
  }

  async sendTransaction(
    account: IChainAccount,
    signedTransaction: Transaction
  ): Promise<string> {
    return this.client.sendRawTransaction(signedTransaction.serialize())
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
