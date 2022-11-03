import { defaultProvider } from 'starknet'

import { IChainAccount, INetwork } from '~lib/schema'
import { Provider, TransactionPayload } from '~lib/services/provider'

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

  estimateGasPrice(): Promise<any> {
    return Promise.resolve(undefined)
  }

  getBalance(address: string): Promise<string> {
    return Promise.resolve('')
  }

  getBalances(addresses: string[]): Promise<string[]> {
    return Promise.resolve([])
  }

  getNextNonce(address: string, tag?: string | number): Promise<number> {
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

  sendTransaction(signedTransaction: any): Promise<any> {
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
}
