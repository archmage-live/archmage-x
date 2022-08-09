import { NetworkKind } from '~lib/network'
import { CosmWallet } from '~lib/wallet/cosm'
import { EvmWallet } from '~lib/wallet/evm'
import { SolWallet } from '~lib/wallet/sol'

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
export * from './cosm'
export * from './aptos'
export * from './sui'
export * from './aleo'
export * from './sol'

export function getDefaultPathPrefix(networkKind: NetworkKind): string {
  switch (networkKind) {
    case NetworkKind.EVM:
      return EvmWallet.defaultPathPrefix
    case NetworkKind.COSM:
      return CosmWallet.defaultPathPrefix
    case NetworkKind.SOL:
      return SolWallet.defaultPathPrefix
  }
}
