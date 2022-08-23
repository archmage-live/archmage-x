import { NetworkKind } from '~lib/network'

export interface ITransaction {
  id: number
  masterId: number // master wallet id
  index: number // derived wallet index; -1 for imported single wallet
  networkKind: NetworkKind
  chainId: number | string
}
