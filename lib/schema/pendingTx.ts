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
  nonce: number // nonce of the transaction; for no-nonce chain, it can be the timestamp
  hash?: string // it can be the transaction hash
  info: any
}

export const pendingTxSchemaV1 =
  '++id, &[masterId+index+networkKind+chainId+address+nonce], &[networkKind+chainId+masterId+index+address+nonce], [masterId+index+networkKind+chainId+address+hash]'
