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
  // TODO
}

export * from './evm'
// export * from './cosm'
export * from './aptos'
export * from './sui'
export * from './aleo'
export * from './sol'
