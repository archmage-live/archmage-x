import { WalletType } from '~lib/wallet'

export interface IWallet {
  id?: number
  sortId: number
  type: WalletType
  name: string // unique
  path?: string
  hash: string // ensure the uniqueness of secret phrase
  keystore?: string // encrypted keystore
}

// unique name, unique hash
export const walletSchemaV1 = '++id, sortId, walletType, &name, &hash'
