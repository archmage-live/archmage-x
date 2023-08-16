import {
  AccountsInfo,
  Erc4337Info,
  KeylessWalletInfo,
  SafeInfo
} from '~lib/wallet'

export interface ISubWallet {
  id: number
  masterId: number // master wallet id
  sortId: number // always 0 if pseudo index
  index: Index
  name: string // empty if pseudo index
  // ensure the uniqueness within the master wallet it belongs to.
  // only exists for some wallet types, i.e., WalletType.PRIVATE_KEY_GROUP
  hash?: string
  info: SubWalletInfo
}

// for specific masterId, unique sortId/index/name
export const subWalletSchemaV1 =
  '++id, [masterId+sortId], &[masterId+index], &[masterId+name]'

export interface SubWalletInfo {
  accounts?: AccountsInfo
  erc4337?: Erc4337Info
  safe?: SafeInfo
  keyless?: KeylessWalletInfo
}

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

export function isSubNameInvalid(name: string, index: number) {
  const re = /^Account\s+\d+$/
  return re.test(name) && name !== getDefaultSubName(index)
}
