import { NetworkKind } from '~lib/network'
import { IChainAccount, INft, TokenVisibility } from '~lib/schema'

import { getEvmNftBrief } from './evm'

export interface NftBrief {
  name?: string
  nftId: string
  imageUrl?: string
}

export function getNftBrief(token: INft): NftBrief {
  switch (token.networkKind) {
    case NetworkKind.EVM:
      return getEvmNftBrief(token)
    default:
      throw new Error('unknown nft')
  }
}

export type SearchedNft = {
  token: INft
  existing: boolean
}

interface INftService {
  getNftCount(account: IChainAccount): Promise<number>

  getNfts(account: IChainAccount): Promise<INft[]>

  getNft(
    id: number | { account: IChainAccount; nft: string; nftId: string }
  ): Promise<INft | undefined>

  addNft(
    nft:
      | INft
      | { account: IChainAccount; nft: string; nftId: string; info: any }
  ): Promise<INft>

  setNftVisibility(id: number, visible: TokenVisibility): Promise<void>

  fetchNfts(account: IChainAccount): Promise<void>

  searchNft(
    account: IChainAccount,
    nft: string,
    nftId: string
  ): Promise<SearchedNft | undefined>
}
