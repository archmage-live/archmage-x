export enum WalletType {
  HD = 'hd',
  MNEMONIC_PRIVATE_KEY = 'mnemonic_private_key',
  PRIVATE_KEY = 'private_key',
  LEDGER = 'ledger'
}

export function getWalletTypeIdentifier(type: WalletType) {
  switch (type) {
    case WalletType.HD:
      return 'HD'
    case WalletType.MNEMONIC_PRIVATE_KEY:
    // pass through
    case WalletType.PRIVATE_KEY:
      return '' // empty for simple wallet
    case WalletType.LEDGER:
      return 'LG'
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
