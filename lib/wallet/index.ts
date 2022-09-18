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

export function checkAddress(
  networkKind: NetworkKind,
  address: string
): string | false {
  switch (networkKind) {
    case NetworkKind.EVM:
      return EvmWallet.checkAddress(address)
    case NetworkKind.COSM:
      return CosmWallet.checkAddress(address)
    default:
      return false
  }
}

export function checkAddressMayThrow(
  networkKind: NetworkKind,
  address: string
): string {
  const addr = checkAddress(networkKind, address)
  if (addr === false) throw new Error('invalid address')
  return addr
}

export async function getMasterSigningWallet(
  wallet: IWallet,
  networkKind: NetworkKind,
  chainId: number | string
): Promise<SigningWallet> {
  const opts: WalletOpts = {
    id: wallet.id,
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
  account: IChainAccount
): Promise<SigningWallet> {
  const master = await WALLET_SERVICE.getWallet(account.masterId)
  assert(master)
  let signingWallet = await getMasterSigningWallet(
    master,
    account.networkKind,
    account.chainId
  )
  if (master.type === WalletType.HD) {
    const hdPath = await DB.hdPaths
      .where({ masterId: account.masterId, networkKind: account.networkKind })
      .first()
    assert(hdPath)
    signingWallet = await signingWallet.derive(hdPath.path, account.index!)
  }
  assert(signingWallet.address === account.address)
  return signingWallet
}
