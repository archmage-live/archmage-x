export interface ProviderAdaptor {
  getBalance(address: string): Promise<string>

  getTransactions(address: string): Promise<any>
}

export interface Balance {
  symbol: string
  amount: string // number
  amountParticle: string // number
}
