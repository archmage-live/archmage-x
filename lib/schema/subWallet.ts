export interface ISubWallet {
  id: number
  masterId: number // master wallet id
  sortId: number // always 0 if pseudo index
  index: Index
  name: string // empty if pseudo index
}

// for specific masterId, unique sortId/index/name
export const subWalletSchemaV1 =
  '++id, [masterId+sortId], &[masterId+index], &[masterId+name]'

export const PSEUDO_INDEX = -1 // pseudo index for imported single wallet
export type Index = number | typeof PSEUDO_INDEX

export interface SubIndex {
  masterId: number
  index: Index
}

const namePrefix = 'Account '

export function getDefaultSubName(index: number) {
  return namePrefix + (index + 1)
}
