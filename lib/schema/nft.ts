import { NetworkKind } from '~lib/network'
import { ChainId } from '~lib/schema/network'
import { Index } from '~lib/schema/subWallet'

export interface INft {
  id: number
  masterId: number
  index: Index
  networkKind: NetworkKind
  chainId: ChainId
  address: string
  sortId: number
  collection: string // e.g., contract address
  tokenId: string // nft id
  visible: NftVisibility
  info: any
}

export const nftSchemaV1 =
  '++id, &[masterId+index+networkKind+chainId+address+collection+tokenId], [masterId+index+networkKind+chainId+address+sortId], [networkKind+chainId]'

export enum NftVisibility {
  UNSPECIFIED = 'unspecified',
  HIDE = 'hide'
}
