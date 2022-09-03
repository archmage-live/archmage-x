import { NetworkKind } from '~lib/network'

import { ChainId } from './network'
import { Index } from './subWallet'

export interface IChainAccount {
  id: number
  masterId: number // master wallet id
  index: Index // derived wallet index
  networkKind: NetworkKind
  chainId: ChainId
  address: string | undefined // undefined means no chain account on the specific chain
  info: any
}

export const chainAccountSchemaV1 =
  '++id, &[masterId+index+networkKind+chainId], &[masterId+networkKind+chainId+index], address'

export function isValidChainAccount(account: IChainAccount) {
  return !!account.address
}

export type ChainAccountIndex = {
  masterId: number
  index: Index
  networkKind: NetworkKind
  chainId: number | string
}
