import { NetworkKind } from '~lib/network'

export interface IHdPath {
  id: number
  masterId: number // master wallet id
  networkKind: NetworkKind
  path: string // hd derivation path
  info?: HdPathInfo
}

export const hdPathSchemaV1 = '++id, &[masterId+networkKind]'

export interface HdPathInfo {
  derivePosition?: DerivePosition
}

// https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki
// Path levels:
// m / purpose' / coin_type' / account' / change / address_index
// Generally, `address_index` will be used as derive position.
// However, you also can specify `account` or `change` as derive position.
export enum DerivePosition {
  ACCOUNT = 2,
  CHANGE = 3,
  ADDRESS_INDEX = 4
}
