import { Index } from "~lib/schema/subWallet";
import { NetworkKind } from "~lib/network";
import { ChainId } from "~lib/schema/network";
import { TokenVisibility } from "~lib/schema/token";

export interface INft {
  id: number
  masterId: number // master wallet id
  index: Index // sub wallet index
  networkKind: NetworkKind
  chainId: ChainId
  address: string
  sortId: number
  nft: string // nft collection unique identifier, e.g., nft contract address
  nftId: string // nft id
  visible: TokenVisibility
  info: any
}

export const nftSchemaV1 =
  '++id, &[masterId+index+networkKind+chainId+address+nft+nftId], [masterId+index+networkKind+chainId+address+sortId], [networkKind+chainId]'
