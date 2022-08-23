import Dexie from 'dexie'

import { generateName } from '~lib/db'
import { WalletType } from '~lib/wallet'

export interface IWallet {
  id: number
  sortId: number
  type: WalletType
  name: string // unique
  path?: string
  hash: string // ensure the uniqueness of secret phrase
  createdAt: number
  keystore?: string // encrypted keystore
}

// unique name, unique hash
export const walletSchemaV1 = '++id, sortId, type, &name, &hash'

const namePrefix = 'Wallet '

export async function generateDefaultWalletName(table: Dexie.Table<IWallet>) {
  return generateName(table, namePrefix)
}
