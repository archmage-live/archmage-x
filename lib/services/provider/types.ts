import { NetworkKind } from '~lib/network'
import { IChainAccount, INetwork } from '~lib/schema'
import { formatEvmTxParams } from '~lib/services/provider/evm/types'

export interface ProviderAdaptor {
  isContract(address: string): Promise<boolean>

  getBalance(address: string): Promise<string>

  getBalances(address: string[]): Promise<string[] | undefined>

  getTransactions(address: string): Promise<any>

  estimateGasPrice(): Promise<any>

  estimateSendGas(account: IChainAccount, to: string): Promise<string>

  populateTransaction(
    account: IChainAccount,
    transaction: any
  ): Promise<TransactionPayload>

  signTransaction(account: IChainAccount, transaction: any): Promise<any>

  sendTransaction(signedTransaction: any): Promise<any>

  signMessage(account: IChainAccount, message: any): Promise<any>

  signTypedData(account: IChainAccount, typedData: any): Promise<any>
}

export type TransactionPayload = {
  txParams: any
  populatedParams: any
}

export function formatTxParams(
  network: INetwork,
  params?: any,
  populatedParams?: any
) {
  switch (network.kind) {
    case NetworkKind.EVM:
      return formatEvmTxParams(params, populatedParams)
  }
  throw new Error(`provider for network ${network.kind} is not implemented`)
}
