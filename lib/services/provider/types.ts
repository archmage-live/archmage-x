import { IChainAccount } from '~lib/schema'

export interface ProviderAdaptor {
  getBalance(address: string): Promise<string>

  getTransactions(address: string): Promise<any>

  signTransaction(account: IChainAccount, transaction: any): Promise<any>

  sendTransaction(signedTransaction: any): Promise<any>

  signMessage(account: IChainAccount, message: any): Promise<any>

  signTypedData(account: IChainAccount, typedData: any): Promise<any>
}

export interface Balance {
  symbol: string
  amount: string // number
  amountParticle: string // number
}
