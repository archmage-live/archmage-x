import { NetworkKind } from '~lib/network'

import { ChainId } from './network'
import { Index } from './subWallet'

export interface IPendingTx {
  id: number
  masterId: number // master wallet id
  index: Index // derived wallet index
  networkKind: NetworkKind
  chainId: ChainId
  address: string
  nonce: number
  info: any
}

export const pendingTxSchemaV1 =
  '++id, &[masterId+index+networkKind+chainId+address+nonce]'
