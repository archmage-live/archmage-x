import { IChainAccount } from '~lib/schema'

export interface ProviderAdaptor {
  isContract(address: string): Promise<boolean>

  getBalance(address: string): Promise<string>

  getBalances(address: string[]): Promise<string[] | undefined>

  getTransactions(address: string): Promise<any>

  estimateGasPrice(): Promise<any>

  estimateSendGas(account: IChainAccount, to: string): Promise<string>

  signTransaction(account: IChainAccount, transaction: any): Promise<any>

  sendTransaction(signedTransaction: any): Promise<any>

  signMessage(account: IChainAccount, message: any): Promise<any>

  signTypedData(account: IChainAccount, typedData: any): Promise<any>
}
