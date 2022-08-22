import { NetworkKind } from '~lib/network'

import { Index } from './derivedWallet'

export interface IChainAccount {
  id?: number
  masterId: number // master wallet id
  index: Index // derived wallet index
  networkKind: NetworkKind
  chainId: number | string
  address: string
  info: any
}

export const chainAccountSchemaV1 =
  '++id, &[masterId+index+networkKind+chainId], &[masterId+networkKind+chainId+index], address'

export type ChainAccountIndex = {
  masterId: number
  index: Index
  networkKind: NetworkKind
  chainId: number | string
}