import assert from 'assert'

import { NetworkKind } from '~lib/network'
import { CosmAppChainInfo } from '~lib/network/cosm'
import { IChainAccount, IChainAccountAux } from '~lib/schema'
import { IWallet } from '~lib/schema/wallet'
import { NETWORK_SERVICE } from '~lib/services/network'
import { WALLET_SERVICE } from '~lib/services/wallet'

import { AptosWallet } from './aptos'
import {
  KeystoreSigningWallet,
  SigningWallet,
  WalletOpts,
  WalletType,
  canWalletSign,
  getDerivePosition,
  hasWalletKeystore,
  isHardwareWallet
} from './base'
import { BtcWallet, BtcWalletOpts } from './btc'
import { CosmWallet, CosmWalletOpts } from './cosm'
import { EvmWallet } from './evm'
import { EvmHwWallet } from './evmHw'
import { SolWallet } from './sol'
import { StarknetWallet } from './starknet'
import { SuiWallet } from './sui'
import { BtcChainInfo } from "~lib/network/btc";
import { BtcHwWallet } from "~lib/wallet/btcHw";

export * from './base'
export * from './btc'
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
    case NetworkKind.BTC:
      return BtcWallet.defaultPath
    case NetworkKind.EVM:
      return EvmWallet.defaultPath
    case NetworkKind.COSM:
      return CosmWallet.defaultPath
    case NetworkKind.STARKNET:
      return StarknetWallet.defaultPath
    case NetworkKind.APTOS:
      return AptosWallet.defaultPath
    case NetworkKind.SUI:
      return SuiWallet.defaultPath
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
    case NetworkKind.SUI:
      return SuiWallet.checkAddress(address)
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
    path: wallet.info.path,
  }
  switch (networkKind) {
    case NetworkKind.BTC: {
      const network = await NETWORK_SERVICE.getNetwork({
        kind: networkKind,
        chainId
      })
      assert(network)
      const info = network.info as BtcChainInfo
      assert(wallet.info.addressType)
      return BtcWallet.from({
        ...opts,
        extra: {
          addressType: wallet.info.addressType,
          isTestnet: info.isTestnet,
          network: info.network,
        }
      } as BtcWalletOpts)
    }
    case NetworkKind.EVM:
      return EvmWallet.from(opts)
    case NetworkKind.COSM: {
      const network = await NETWORK_SERVICE.getNetwork({
        kind: networkKind,
        chainId
      })
      assert(network)
      const info = network.info as CosmAppChainInfo
      return CosmWallet.from({
        ...opts,
        prefix: info.bech32Config.bech32PrefixAccAddr
      } as CosmWalletOpts)
    }
    case NetworkKind.APTOS:
      return AptosWallet.from(opts)
    case NetworkKind.SUI:
      return SuiWallet.from(opts)
    case NetworkKind.SOL:
      return SolWallet.from(opts)
  }
}

export async function getHardwareSigningWallet(
  wallet: IWallet,
  account: IChainAccount,
  aux?: IChainAccountAux
): Promise<SigningWallet | undefined> {
  if (hasWalletKeystore(wallet.type) || !canWalletSign(wallet.type)) {
    return undefined
  }
  switch (account.networkKind) {
    case NetworkKind.BTC: {
      const network = await NETWORK_SERVICE.getNetwork({
        kind: account.networkKind,
        chainId: account.chainId
      })
      assert(network)
      const info = network.info as BtcChainInfo
      return new BtcHwWallet(
        wallet.hash,
        account.address!,
        wallet.info.addressType!,
        info.network,
        {
          pathTemplate: wallet.info.pathTemplate!,
          derivePosition: wallet.info.derivePosition
        },
        wallet.type === WalletType.HW ? wallet.info.path! : account.index,
        account.info.publicKey || aux?.info.publicKey
      )
    }
    case NetworkKind.EVM:
      return new EvmHwWallet(
        wallet.hash,
        account.address!,
        {
          pathTemplate: wallet.info.pathTemplate!,
          derivePosition: wallet.info.derivePosition
        },
        wallet.type === WalletType.HW ? wallet.info.path! : account.index,
        account.info.publicKey || aux?.info.publicKey
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
  } else if (isHardwareWallet(master.type)) {
    const aux = await WALLET_SERVICE.getChainAccountAux({
      masterId: account.masterId,
      index: account.index,
      networkKind: account.networkKind
    })
    return getHardwareSigningWallet(master, account, aux)
  }
}
