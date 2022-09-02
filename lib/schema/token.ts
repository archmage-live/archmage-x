import { NetworkKind } from '~lib/network'
import { Index } from '~lib/schema/subWallet'
import { ChainId } from '~lib/schema/network'

export interface IToken {
  id: number
  masterId: number // master wallet id
  index: Index // derived wallet index
  networkKind: NetworkKind
  chainId: ChainId
  address: string
  sortId: number
  token: string // token unique identifier, e.g., token contract address
  visible: TokenVisibility
  info: any
}

export const tokenSchemaV1 =
  '++id, &[masterId+index+networkKind+chainId+address+token], [masterId+index+networkKind+chainId+address+sortId]'

export enum TokenVisibility {
  UNSPECIFIED = 'unspecified',
  SHOW = 'show',
  HIDE = 'hide'
}
