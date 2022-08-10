export interface IDerivedWallet {
  id?: number
  masterId: number // master wallet id
  sortId: number
  index: number
  name: string
}

// for specific masterId, unique sortId/index/name
export const derivedWalletSchemaV1 =
  '++id, [masterId+sortId], &[masterId+index], &[masterId+name]'

const namePrefix = 'Wallet '

export function getDefaultDerivedName(index: number) {
  return namePrefix + (index + 1)
}
