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
    case WalletType.PRIVATE_KEY_GROUP:
      return true
    default:
      return false
  }
}

export function getWalletTypeIdentifier(type: WalletType) {
  switch (type) {
    case WalletType.HD:
      return 'HD'
    case WalletType.PRIVATE_KEY:
      return '' // empty for simple wallet
    case WalletType.WATCH:
      return 'WH'
    case WalletType.WATCH_GROUP:
      return 'WG'
    case WalletType.HW:
      return 'HW'
    case WalletType.HW_GROUP:
      return 'HG'
  }
}

export interface WalletOpts {
  id: number // wallet id in db
  type: WalletType
  path?: string
  prefix?: string // for Cosm
}

export interface SigningWallet {
  address: string

  derive(prefixPath: string, index: number): Promise<SigningWallet>

  signTransaction(transaction: any): Promise<string>

  signMessage(message: any): Promise<string>

  signTypedData(typedData: any): Promise<string>
}
