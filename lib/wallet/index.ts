import assert from 'assert'
import { ethers } from 'ethers'

import { NetworkKind } from '~lib/network'
import { BtcChainInfo } from '~lib/network/btc'
import { CosmAppChainInfo } from '~lib/network/cosm'
import { IChainAccount, ISubWallet, Index, PSEUDO_INDEX } from '~lib/schema'
import { IWallet } from '~lib/schema/wallet'
import { NETWORK_SERVICE } from '~lib/services/network'
import { WALLET_SERVICE } from '~lib/services/wallet'
import { BtcHwWallet } from '~lib/wallet/btcHw'

import { AptosWallet } from './aptos'
import {
  KeystoreSigningWallet,
  SigningWallet,
  WalletOpts,
  WalletType,
  canWalletSign,
  getDerivePosition,
  hasSubKeystore,
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

export function isMnemonic(mnemonic: string): boolean {
  try {
    const _ = ethers.utils.HDNode.fromMnemonic(mnemonic)
    return true
  } catch {
    return false
  }
}

export function checkPrivateKey(privateKey: string): ethers.Wallet | false {
  try {
    // TODO: private key which is not compatible with Ethereum?
    return new ethers.Wallet(privateKey)
  } catch {
    return false
  }
}

export function checkPrivateKeyFromMnemonic(mnemonic: string, path: string) {
  try {
    // TODO: private key which is not compatible with Ethereum?
    return ethers.Wallet.fromMnemonic(mnemonic, path)
  } catch {
    return false
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

export async function getStructuralSigningWallet(
  wallet: IWallet,
  networkKind: NetworkKind,
  chainId: number | string,
  index?: Index
): Promise<KeystoreSigningWallet | undefined> {
  if (!hasWalletKeystore(wallet.type)) {
    return undefined
  }

  assert(
    hasSubKeystore(wallet.type) ===
      (typeof index === 'number' && index > PSEUDO_INDEX)
  )

  const opts: WalletOpts = {
    id: wallet.id,
    type: wallet.type,
    index,
    path: wallet.info.path
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
          network: info.network
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
  subWallet: ISubWallet,
  account: IChainAccount
): Promise<SigningWallet | undefined> {
  if (!isHardwareWallet(wallet.type)) {
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
        account.info.publicKey || subWallet?.info.publicKey
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
        account.info.publicKey || subWallet?.info.publicKey
      )
  }
}

export async function getSigningWallet(
  account: IChainAccount
): Promise<SigningWallet | undefined> {
  const master = await WALLET_SERVICE.getWallet(account.masterId)
  assert(master)

  if (hasWalletKeystore(master.type)) {
    let signingWallet = await getStructuralSigningWallet(
      master,
      account.networkKind,
      account.chainId,
      hasSubKeystore(master.type) ? account.index : undefined
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
    const subWallet = await WALLET_SERVICE.getSubWallet({
      masterId: account.masterId,
      index: account.index
    })
    assert(subWallet)
    return getHardwareSigningWallet(master, subWallet, account)
  }
}
