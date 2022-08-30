import { NetworkKind } from '~lib/network'

import { Index } from './derivedWallet'
import { ChainId } from './network'

export interface ITransaction {
  id: number
  masterId: number // master wallet id
  index: Index // derived wallet index
  networkKind: NetworkKind
  chainId: ChainId
  address: string
  nonce: number
  info: any
}

export const transactionSchemaV1 =
  '++id, &[masterId+index+networkKind+chainId+address+nonce]'
