import { NetworkKind } from '~lib/network'

export interface IHdPath {
  id?: number
  masterId: number // master wallet id
  networkType: NetworkKind
  path: string // hd derivation path
}

export const hdPathSchemaV1 = '++id, &[masterId+networkType+path]'
