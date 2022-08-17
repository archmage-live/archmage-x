import { IWalletInfo } from '~lib/schema'

export interface ProviderAdaptor {
  getBalance(address: string): Promise<string>

  getTransactions(address: string): Promise<any>

  signTransaction(wallet: IWalletInfo, transaction: any): Promise<any>

  sendTransaction(signedTransaction: any): Promise<any>
}

export interface Balance {
  symbol: string
  amount: string // number
  amountParticle: string // number
}
