import assert from 'assert'

import { DB } from '~lib/db'
import { NetworkKind } from '~lib/network'
import { CosmChainInfo } from '~lib/network/cosm'
import { IChainAccount } from '~lib/schema'
import { IWallet } from '~lib/schema/wallet'
import { NETWORK_SERVICE } from '~lib/services/network'
import { WALLET_SERVICE } from '~lib/services/walletService'

import { SigningWallet, WalletOpts, WalletType } from './base'
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

export async function getMasterSigningWallet(
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
      const network = await NETWORK_SERVICE.getNetwork({
        kind: networkKind,
        chainId
      })
      assert(network !== undefined)
      const info = network.info as CosmChainInfo
      opts.prefix = info.bech32Config.bech32PrefixAccAddr
      return CosmWallet.from(opts)
    case NetworkKind.SOL:
      return SolWallet.from(opts)
  }
}

export async function getSigningWallet(
  wallet: IChainAccount
): Promise<SigningWallet> {
  const master = await WALLET_SERVICE.getWallet(wallet.masterId)
  assert(master)
  const hdPath = await DB.hdPaths
    .where({ masterId: wallet.id, networkKind: wallet.networkKind })
    .first()
  assert(hdPath)

  let signingWallet = await getMasterSigningWallet(
    master,
    wallet.networkKind,
    wallet.chainId
  )
  if (master.type === WalletType.HD) {
    signingWallet = await signingWallet.derive(hdPath.path, wallet.index!)
  }
  assert(signingWallet.address === wallet.address)
  return signingWallet
}
