import { NetworkKind } from '~lib/network'
import { SafeInfo, StarknetInfo } from '~lib/wallet'

import { ChainId } from './network'
import { Index } from './subWallet'

export interface IChainAccount {
  id: number
  masterId: number // master wallet id
  index: Index // derived wallet index
  networkKind: NetworkKind
  chainId: ChainId
  address: string | undefined // undefined means no chain account on the specific chain
  info: ChainAccountInfo
}

export interface ChainAccountInfo {
  publicKey?: string
  utxos?: Utxo[] // cached UTXOs if no `subAccounts`
  subAccounts?: SubChainAccount[][] // for Bitcoin sub addresses

  safe?: SafeInfo
  starknet?: StarknetInfo
}

// Bitcoin sub address
export interface SubChainAccount {
  changeIndex: number
  addressIndex: number
  publicKey: string
  address: string
  utxos?: Utxo[] // cached UTXOs
}

export interface Utxo {
  txid: string
  vout: number
  value: number // $sat amount
}

export const chainAccountSchemaV1 =
  '++id, &[masterId+index+networkKind+chainId], &[masterId+networkKind+chainId+index], &[networkKind+chainId+masterId+index], address'

export function isValidChainAccount(account: IChainAccount) {
  return !!account.address
}

export type ChainAccountIndex = {
  masterId: number
  index: Index
  networkKind: NetworkKind
  chainId: number | string
}
