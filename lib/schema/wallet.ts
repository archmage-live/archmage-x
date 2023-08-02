import Dexie from 'dexie'

import { generateName } from '~lib/db'
import { DerivePosition } from '~lib/schema/hdPath'
import {
  AccountAbstractionInfo,
  BtcAddressType,
  Erc4337Info,
  HardwareWalletType,
  KeylessWalletInfo,
  WalletType
} from '~lib/wallet'

export interface IWallet {
  id: number
  sortId: number
  type: WalletType
  name: string // unique
  hash: string // ensure the uniqueness of secret phrase
  info: WalletInfo
  createdAt: number
}

// unique name, unique hash
export const walletSchemaV1 = '++id, sortId, type, &name, &hash'

export interface WalletInfo {
  hwType?: HardwareWalletType
  path?: string
  pathTemplate?: string
  derivePosition?: DerivePosition
  notBackedUp?: boolean
  addressType?: BtcAddressType // for Bitcoin
  accountAbstraction?: AccountAbstractionInfo
  erc4337?: Erc4337Info
  keyless?: KeylessWalletInfo
}

const namePrefix = 'Wallet '

export async function generateDefaultWalletName(table: Dexie.Table<IWallet>) {
  return generateName(table, namePrefix)
}
