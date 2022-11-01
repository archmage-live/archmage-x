import assert from 'assert'

import { NetworkKind } from '~lib/network'
import { CosmChainInfo } from '~lib/network/cosm'
import { IChainAccount } from '~lib/schema'
import { IWallet } from '~lib/schema/wallet'
import { NETWORK_SERVICE } from '~lib/services/network'
import { WALLET_SERVICE } from '~lib/services/wallet'
import { EvmHwWallet } from '~lib/wallet/evmHw'

import { AptosWallet } from './aptos'
import {
  KeystoreSigningWallet,
  SigningWallet,
  WalletOpts,
  WalletType,
  canWalletSign,
  getDerivePosition,
  hasWalletKeystore,
  isWalletHardware
} from './base'
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

export function isUseEd25519Curve(networkKind: NetworkKind): boolean {
  switch (networkKind) {
    case NetworkKind.APTOS:
    // pass through
    case NetworkKind.SOL:
      return true
    default:
      return false
  }
}

export function getDefaultPath(networkKind: NetworkKind): string {
  switch (networkKind) {
    case NetworkKind.EVM:
      return EvmWallet.defaultPath
    case NetworkKind.COSM:
      return CosmWallet.defaultPath
    case NetworkKind.APTOS:
      return AptosWallet.defaultPath
    case NetworkKind.SOL:
      return SolWallet.defaultPath
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
    case NetworkKind.APTOS:
      return AptosWallet.checkAddress(address)
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
): Promise<KeystoreSigningWallet | undefined> {
  if (!hasWalletKeystore(wallet.type)) {
    return undefined
  }
  const opts: WalletOpts = {
    id: wallet.id,
    type: wallet.type,
    path: wallet.info.path
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
    case NetworkKind.APTOS:
      return AptosWallet.from(opts)
    case NetworkKind.SOL:
      return SolWallet.from(opts)
  }
}

export async function getHardwareSigningWallet(
  wallet: IWallet,
  account: IChainAccount
): Promise<SigningWallet | undefined> {
  if (hasWalletKeystore(wallet.type) || !canWalletSign(wallet.type)) {
    return undefined
  }
  switch (account.networkKind) {
    case NetworkKind.EVM:
      return new EvmHwWallet(
        wallet.hash,
        account.address!,
        wallet.type === WalletType.HW
          ? wallet.info.path!
          : {
              pathTemplate: wallet.info.path!,
              index: account.index,
              derivePosition: wallet.info.derivePosition
            }
      )
  }
}

export async function getSigningWallet(
  account: IChainAccount
): Promise<SigningWallet | undefined> {
  const master = await WALLET_SERVICE.getWallet(account.masterId)
  assert(master)

  if (hasWalletKeystore(master.type)) {
    let signingWallet = await getMasterSigningWallet(
      master,
      account.networkKind,
      account.chainId
    )
    if (!signingWallet) {
      return undefined
    }

    if (master.type === WalletType.HD) {
      const hdPath = await WALLET_SERVICE.getHdPath(
        account.masterId,
        account.networkKind
      )
      if (!hdPath) {
        return undefined
      }
      signingWallet = await signingWallet.derive(
        hdPath.path,
        account.index,
        getDerivePosition(hdPath, account.networkKind)
      )
    }

    assert(signingWallet.address === account.address)
    return signingWallet
  } else if (isWalletHardware(master.type)) {
    return getHardwareSigningWallet(master, account)
  }
}
