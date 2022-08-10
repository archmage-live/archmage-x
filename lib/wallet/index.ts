import assert from 'assert'

import { NetworkKind } from '~lib/network'
import { CosmChainInfo } from '~lib/network/cosm'
import { IWallet } from '~lib/schema/wallet'
import { COSM_NETWORK_SERVICE } from '~lib/services/network/cosmService'

import { SigningWallet, WalletOpts } from './base'
import { CosmWallet } from './cosm'
import { EvmWallet } from './evm'
import { SolWallet } from './sol'

export * from './base'
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

export async function getSigningWallet(
  wallet: IWallet,
  networkKind: NetworkKind,
  chainId: number | string
): Promise<SigningWallet> {
  assert(wallet.id !== undefined)
  const opts: WalletOpts = {
    id: wallet.id!,
    type: wallet.type,
    path: wallet.path
  }
  switch (networkKind) {
    case NetworkKind.EVM:
      return EvmWallet.from(opts)
    case NetworkKind.COSM:
      const network = await COSM_NETWORK_SERVICE.getNetwork(
        networkKind,
        chainId
      )
      assert(network !== undefined)
      const info = network.info as CosmChainInfo
      opts.prefix = info.bech32Config.bech32PrefixAccAddr
      return CosmWallet.from(opts)
    case NetworkKind.SOL:
      return SolWallet.from(opts)
  }
}
