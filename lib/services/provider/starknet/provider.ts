import { defaultProvider } from 'starknet'

import { IChainAccount, INetwork } from '~lib/schema'
import { Provider, TransactionPayload } from '~lib/services/provider'
import { getSigningWallet } from '~lib/wallet'

import { StarknetClient, getStarknetClient } from './client'

export class StarknetProvider implements Provider {
  constructor(public client: StarknetClient) {}

  static async from(network: INetwork) {
    const client = await getStarknetClient(network)
    return new StarknetProvider(client)
  }

  async isOk(): Promise<boolean> {
    try {
      await defaultProvider.getBlock()
      return true
    } catch (err) {
      console.error(err)
      return false
    }
  }

  async isContract(address: string): Promise<boolean> {
    const code = await defaultProvider.getCode(address)
    return code.bytecode.length > 0
  }

  estimateGas(account: IChainAccount, tx: any): Promise<string> {
    return Promise.resolve('')
  }

  estimateGasPrice(account: IChainAccount): Promise<any> {
    return Promise.resolve(undefined)
  }

  getBalance(
    accountOrAddress: IChainAccount | string
  ): Promise<string | undefined> {
    return Promise.resolve('')
  }

  getBalances(
    accountsOrAddresses: IChainAccount[] | string[]
  ): Promise<(string | undefined)[]> {
    return Promise.resolve([])
  }

  getNextNonce(account: IChainAccount, tag?: string | number): Promise<number> {
    return Promise.resolve(0)
  }

  getTypedData(typedData: any): Promise<any> {
    return Promise.resolve(undefined)
  }

  populateTransaction(
    account: IChainAccount,
    transaction: any
  ): Promise<TransactionPayload> {
    return Promise.resolve({} as any)
  }

  sendTransaction(
    account: IChainAccount,
    signedTransaction: any
  ): Promise<any> {
    return Promise.resolve(undefined)
  }

  signMessage(account: IChainAccount, message: any): Promise<any> {
    return Promise.resolve(undefined)
  }

  signTransaction(account: IChainAccount, transaction: any): Promise<any> {
    return Promise.resolve(undefined)
  }

  signTypedData(account: IChainAccount, typedData: any): Promise<any> {
    return Promise.resolve(undefined)
  }

  async isSignable(account: IChainAccount): Promise<boolean> {
    return !!(await getSigningWallet(account))
  }
}
