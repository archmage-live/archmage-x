import { NetworkKind } from '~lib/network'

export interface IHdPath {
  id?: number
  masterId: number // master wallet id
  networkKind: NetworkKind
  path: string // hd derivation path
}

export const hdPathSchemaV1 = '++id, &[masterId+networkKind]'
