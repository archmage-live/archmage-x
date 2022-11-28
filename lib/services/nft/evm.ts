import { INft } from '~lib/schema'
import { AlchemyNft } from '~lib/services/datasource/alchemy'
import { MoralisNft } from '~lib/services/datasource/moralis'

import { NftBrief } from '.'

type EvmNftInfo = AlchemyNft | MoralisNft

function isAlchemyNft(info: EvmNftInfo): info is AlchemyNft {
  return !!(info as AlchemyNft).contract
}

export function getEvmNftBrief(token: INft): NftBrief {
  const info = token.info as EvmNftInfo

  const metadata = (
    isAlchemyNft(info) ? info.rawMetadata : info.metadata
  ) as any

  return {
    name: metadata?.name,
    nftId: String(info.tokenId),
    imageUrl: metadata?.image || metadata?.image_url
  }
}
