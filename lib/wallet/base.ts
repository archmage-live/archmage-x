export enum WalletType {
  HD = 'hd',
  MNEMONIC_PRIVATE_KEY = 'mnemonic_private_key',
  PRIVATE_KEY = 'private_key',
  LEDGER = 'ledger'
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
}
