import { NetworkKind } from '~lib/network'

import { ChainId } from './network'
import { Index } from './subWallet'

export interface ITransaction {
  id: number
  masterId: number // master wallet id
  index: Index // derived wallet index
  networkKind: NetworkKind
  chainId: ChainId
  address: string
  type: string // transaction type, e.g., normal/internal/erc20/erc721/...
  index1: number | string // e.g., block number
  index2: number | string // e.g., transaction index or hash
  info: any
}

export const transactionSchemaV1 =
  '++id, &[masterId+index+networkKind+chainId+address+type+index1+index2], &[masterId+index+networkKind+chainId+address+type+index2+index1], [networkKind+chainId]'
