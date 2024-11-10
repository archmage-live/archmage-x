import { WalletInfo, WalletType } from '@/archmage/wallet/types'

export interface IWallet {
  id: number
  sortId: number
  type: WalletType
  name: string // unique
  hash: string // ensure the uniqueness of wallet
  info: WalletInfo
  createdAt: number
}
