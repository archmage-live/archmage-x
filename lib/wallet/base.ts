import { Slip10RawIndex, pathToString, stringToPath } from '@cosmjs/crypto'
import assert from 'assert'

import { NetworkKind } from '~lib/network'
import { DerivePosition, IHdPath, IWallet } from '~lib/schema'

export enum WalletType {
  HD = 'hd', // Hierarchical Deterministic, derived from mnemonic
  PRIVATE_KEY = 'private_key', // private key (maybe derived from mnemonic)
  PRIVATE_KEY_GROUP = 'private_key_group', // ditto, but in group
  WATCH = 'watch', // only watch, no signing
  WATCH_GROUP = 'watch_group', // ditto, but in group
  HW = 'hw', // hardware
  HW_GROUP = 'hw_group' // ditto, but in group
}

export function isWalletGroup(type: WalletType) {
  switch (type) {
    case WalletType.HD:
    // pass through
    case WalletType.PRIVATE_KEY_GROUP:
    // pass through
    case WalletType.WATCH_GROUP:
    // pass through
    case WalletType.HW_GROUP:
      return true
    default:
      return false
  }
}

export function hasWalletKeystore(type: WalletType) {
  switch (type) {
    case WalletType.HD:
    // pass through
    case WalletType.PRIVATE_KEY:
    // pass through
    case WalletType.PRIVATE_KEY_GROUP:
      return true
    default:
      return false
  }
}

export function isWalletHardware(type: WalletType) {
  switch (type) {
    case WalletType.HW:
    // pass through
    case WalletType.HW_GROUP:
      return true
    default:
      return false
  }
}

export function canWalletSign(type: WalletType) {
  return isWalletHardware(type) || hasWalletKeystore(type)
}

export function getWalletTypeIdentifier(wallet: IWallet) {
  switch (wallet.type) {
    case WalletType.HD:
      return 'HD'
    case WalletType.PRIVATE_KEY:
      return '' // empty for simple wallet
    case WalletType.WATCH:
      return 'Watch'
    case WalletType.WATCH_GROUP:
      return 'Watch Group'
    case WalletType.HW:
      return wallet.info.hwType
    case WalletType.HW_GROUP:
      return wallet.info.hwType
  }
}

export function getWalletTypeTitle(wallet: IWallet) {
  switch (wallet.type) {
    case WalletType.HD:
      return 'Hierarchical Deterministic (HD)'
    case WalletType.PRIVATE_KEY:
      return 'Controlled by Private Key'
    case WalletType.WATCH:
      return 'Watch Address'
    case WalletType.WATCH_GROUP:
      return 'Watch Address Group'
    case WalletType.HW:
      return 'Connected ' + wallet.info.hwType
    case WalletType.HW_GROUP:
      return 'Connected ' + wallet.info.hwType
  }
}

export enum HardwareWalletType {
  LEDGER = 'Ledger'
}

export interface HardwareWalletAccount {
  address: string
  index: number
  publicKey?: string
}

export interface WalletOpts {
  id: number // wallet id in db
  type: WalletType
  path?: string
  prefix?: string // for Cosm
}

export interface SigningWallet {
  address: string
  privateKey?: string
  publicKey?: string

  signTransaction(transaction: any): Promise<any>

  signMessage(message: any): Promise<string>

  signTypedData(typedData: any): Promise<string>
}

export interface KeystoreSigningWallet extends SigningWallet {
  privateKey: string
  publicKey: string

  derive(
    pathTemplate: string,
    index: number,
    derivePosition?: DerivePosition
  ): Promise<KeystoreSigningWallet>
}

export function getDefaultDerivePosition(
  networkKind: NetworkKind
): DerivePosition {
  switch (networkKind) {
    case NetworkKind.APTOS:
      return DerivePosition.ACCOUNT
    default:
      return DerivePosition.ADDRESS_INDEX
  }
}

export function getDerivePosition(
  hdPath: IHdPath,
  networkKind: NetworkKind
): DerivePosition {
  return hdPath.info?.derivePosition || getDefaultDerivePosition(networkKind)
}

export function generatePath(
  pathTemplate: string,
  index: number,
  derivePosition?: DerivePosition
) {
  const path = stringToPath(pathTemplate)
  if (!derivePosition) {
    derivePosition = DerivePosition.ADDRESS_INDEX
  }
  assert(derivePosition < path.length)
  const component = path[derivePosition].isHardened()
    ? Slip10RawIndex.hardened(index)
    : Slip10RawIndex.normal(index)
  return pathToString([
    ...(path.slice(0, derivePosition) || []),
    component,
    ...(path.slice(derivePosition + 1) || [])
  ])
}
