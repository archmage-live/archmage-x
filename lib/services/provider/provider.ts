import { NetworkKind } from '~lib/network'
import { IChainAccount, INetwork } from '~lib/schema'
import { AptosProvider } from '~lib/services/provider/aptos/provider'
import { formatAptosTxParams } from '~lib/services/provider/aptos/types'
import { CosmProvider } from '~lib/services/provider/cosm/provider'
import { formatCosmTxParams } from '~lib/services/provider/cosm/types'
import { EvmProvider } from '~lib/services/provider/evm/provider'
import { formatEvmTxParams } from '~lib/services/provider/evm/types'
import { StarknetProvider } from '~lib/services/provider/starknet/provider'
import { formatStarknetTxParams } from '~lib/services/provider/starknet/types'
import { SuiProvider } from '~lib/services/provider/sui/provider'
import { formatSuiTxParams } from '~lib/services/provider/sui/types'

export interface Provider {
  isOk(): Promise<boolean>

  isContract(address: string): Promise<boolean>

  getNextNonce(account: IChainAccount, tag?: string | number): Promise<number>

  getBalance(
    accountOrAddress: IChainAccount | string
  ): Promise<string | undefined>

  getBalances(
    accountsOrAddresses: IChainAccount[] | string[]
  ): Promise<(string | undefined)[]>

  estimateGasPrice(account: IChainAccount): Promise<any>

  estimateGas(account: IChainAccount, tx: any): Promise<string>

  estimateGasFee(account: IChainAccount, tx: any): Promise<string>

  populateTransaction(
    account: IChainAccount,
    transaction: any
  ): Promise<TransactionPayload>

  signTransaction(
    account: IChainAccount,
    transaction: any,
    ...args: any[]
  ): Promise<any>

  sendTransaction(
    account: IChainAccount,
    signedTransaction: any,
    ...args: any[]
  ): Promise<any>

  signMessage(account: IChainAccount, message: any): Promise<any>

  getTypedData(typedData: any): Promise<any>

  signTypedData(account: IChainAccount, typedData: any): Promise<any>

  isSignable(account: IChainAccount): Promise<boolean>
}

export async function getProvider(network: INetwork): Promise<Provider> {
  switch (network.kind) {
    case NetworkKind.EVM:
      return await EvmProvider.from(network)
    case NetworkKind.STARKNET:
      return await StarknetProvider.from(network)
    case NetworkKind.COSM:
      return await CosmProvider.from(network)
    case NetworkKind.APTOS:
      return await AptosProvider.from(network)
    case NetworkKind.SUI:
      return await SuiProvider.from(network)
    case NetworkKind.SOL:
      break
  }
  throw new Error(`provider for network ${network.kind} is not implemented`)
}

export interface TransactionPayload {
  txParams: any
  populatedParams: any
}

export function formatTxPayload(
  network: INetwork,
  payload: TransactionPayload
): TransactionPayload {
  switch (network.kind) {
    case NetworkKind.EVM:
      return formatEvmTxParams(payload)
    case NetworkKind.STARKNET:
      return formatStarknetTxParams(payload)
    case NetworkKind.COSM:
      return formatCosmTxParams(payload)
    case NetworkKind.APTOS:
      return formatAptosTxParams(payload)
    case NetworkKind.SUI:
      return formatSuiTxParams(payload)
  }
  throw new Error(`provider for network ${network.kind} is not implemented`)
}
