import { NetworkKind } from '@/archmage/network'
import { IChainAccount, INetwork } from '~lib/schema'
import { AptosProvider } from '~lib/services/provider/aptos/provider'
import {
  deserializeAptosTxPayload,
  serializeAptosTxPayload
} from '~lib/services/provider/aptos/types'
import { CosmProvider } from '~lib/services/provider/cosm/provider'
import { deserializeCosmTxPayload } from '~lib/services/provider/cosm/types'
import {
  deserializeEthTxPayload,
  serializeEthTxPayload
} from '~lib/services/provider/ethereum/types'
import { EvmProvider } from '~lib/services/provider/evm/provider'
import {
  deserializeSolanaTxPayload,
  serializeSolanaTxPayload
} from '~lib/services/provider/solana/types'
import { StarknetProvider } from '~lib/services/provider/starknet/provider'
import { deserializeStarknetTxPayload } from '~lib/services/provider/starknet/types'
import { SuiProvider } from '~lib/services/provider/sui/provider'
import {
  deserializeSuiTxPayload,
  serializeSuiTxPayload
} from '~lib/services/provider/sui/types'

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

  estimateGasPrice(account: IChainAccount): Promise<any | null>

  estimateGas(account: IChainAccount, tx: any): Promise<string | null>

  estimateGasFee(account: IChainAccount, tx: any): Promise<string | null>

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
    case NetworkKind.SOLANA:
      break
  }
  throw new Error(`provider for network ${network.kind} is not implemented`)
}

export interface TransactionPayload {
  txParams: any
  populatedParams: any
}

export function deserializeTxPayload(
  network: INetwork,
  payload: TransactionPayload
): TransactionPayload {
  switch (network.kind) {
    case NetworkKind.EVM:
      return deserializeEthTxPayload(payload)
    case NetworkKind.SOLANA:
      return deserializeSolanaTxPayload(payload)
    case NetworkKind.STARKNET:
      return deserializeStarknetTxPayload(payload)
    case NetworkKind.COSM:
      return deserializeCosmTxPayload(payload)
    case NetworkKind.APTOS:
      return deserializeAptosTxPayload(payload)
    case NetworkKind.SUI:
      return deserializeSuiTxPayload(payload)
  }
  throw new Error(`provider for network ${network.kind} is not implemented`)
}

export async function serializeTxPayload(
  network: INetwork,
  payload: TransactionPayload
): Promise<TransactionPayload> {
  switch (network.kind) {
    case NetworkKind.EVM:
      return serializeEthTxPayload(payload)
    case NetworkKind.SOLANA:
      return serializeSolanaTxPayload(payload)
    case NetworkKind.APTOS:
      return serializeAptosTxPayload(payload)
    case NetworkKind.SUI:
      return await serializeSuiTxPayload(payload)
    default:
      return payload
  }
}
