import { NetworkKind } from '~lib/network'

import { Index } from './subWallet'

// Only for non-signing wallets
export interface IChainAccountAux {
  id: number
  masterId: number // master wallet id
  index: Index // derived wallet index
  networkKind: NetworkKind
  address: string
}

export const chainAccountAuxSchemaV1 =
  '++id, &[masterId+index+networkKind], &[masterId+networkKind+index], address'
