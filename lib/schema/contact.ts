import { NetworkKind } from '~lib/network'
import { ChainId } from '~lib/schema/network'

export interface IContact {
  id: number
  sortId: number
  name: string
  networkKind: NetworkKind
  // chainId is optional because some network kinds support
  // the same address across different chains
  chainId?: ChainId
  address: string
  memo?: string
}

export const MAX_ADDRESS_BOOK_MEMO_LENGTH = 1024

export const contactSchemaV1 = '++id, sortId'
