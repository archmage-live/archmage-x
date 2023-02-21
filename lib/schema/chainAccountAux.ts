import { NetworkKind } from '~lib/network'

import { Index } from './subWallet'

// Only for non-keystore wallets
export interface IChainAccountAux {
  id: number
  masterId: number // master wallet id
  index: Index // derived wallet index
  networkKind: NetworkKind
  // the same in all networks under the specified network kind;
  // for Cosmos, always has prefix 'cosmos',
  // so may need to be bech32 decoded and encoded.
  address: string
  info: ChainAccountAuxInfo
}

export interface ChainAccountAuxInfo {
  publicKey?: string
}

export const chainAccountAuxSchemaV1 =
  '++id, &[masterId+index+networkKind], &[masterId+networkKind+index], address'
