import assert from 'assert'
import { ethers } from 'ethers'

import { Web3auth } from '~lib/keyless/web3auth'
import { KEYSTORE } from '~lib/keystore'
import { NetworkKind } from '~lib/network'
import { BtcChainInfo } from '~lib/network/btc'
import { CosmAppChainInfo } from '~lib/network/cosm'
import { IChainAccount, ISubWallet } from '~lib/schema'
import { IWallet } from '~lib/schema/wallet'
import { NETWORK_SERVICE } from '~lib/services/network'
import { WALLET_SERVICE } from '~lib/services/wallet'

import { AleoWallet } from './aleo'
import { AptosWallet } from './aptos'
import {
  AccountAbstractionType,
  KeystoreSigningWallet,
  SigningWallet,
  WalletOpts,
  WalletPathSchema,
  WalletType,
  getDerivePosition,
  hasSubKeystore,
  hasWalletKeystore,
  isHardwareWallet,
  isHdWallet,
  isKeylessWallet
} from './base'
import { BtcWallet, BtcWalletOpts } from './btc'
import { BtcHwWallet } from './btcHw'
import { CosmWallet, CosmWalletOpts } from './cosm'
import { EvmWallet } from './evm'
import { EvmErc4337Wallet, EvmErc4337WalletOpts } from './evmErc4337'
import { EvmHwWallet } from './evmHw'
import { EvmHwErc4337Wallet } from './evmHwErc4337'
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
export * from './starknet'

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
    case NetworkKind.ALEO:
      return AleoWallet.defaultPath
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
    case NetworkKind.STARKNET:
      return StarknetWallet.checkAddress(address)
    case NetworkKind.COSM:
      return CosmWallet.checkAddress(address)
    case NetworkKind.APTOS:
      return AptosWallet.checkAddress(address)
    case NetworkKind.SUI:
      return SuiWallet.checkAddress(address)
    case NetworkKind.ALEO:
      return AleoWallet.checkAddress(address)
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
  subWallet: ISubWallet | undefined,
  networkKind: NetworkKind,
  chainId: number | string,
  waitForUnlock: boolean = false
): Promise<KeystoreSigningWallet | undefined> {
  if (!hasWalletKeystore(wallet.type) && !isKeylessWallet(wallet.type)) {
    return undefined
  }

  let keystore
  if (hasWalletKeystore(wallet.type)) {
    keystore = await KEYSTORE.get(
      wallet.id,
      hasSubKeystore(wallet.type) ? subWallet!.index : undefined,
      waitForUnlock
    )
  } else {
    const wa = await Web3auth.create()
    /* if (!wa.connected) {
      return
    } */
    keystore = await wa.getKeystore(wallet, subWallet)
  }

  if (!keystore) {
    return undefined
  }

  const network = await NETWORK_SERVICE.getNetwork({
    kind: networkKind,
    chainId
  })
  assert(network)

  const opts: WalletOpts = {
    type: wallet.type,
    path: wallet.info.path,
    keystore
  }
  switch (networkKind) {
    case NetworkKind.BTC: {
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
    case NetworkKind.EVM: {
      if (!wallet.info.accountAbstraction) {
        return EvmWallet.from(opts)
      } else {
        switch (wallet.info.accountAbstraction.type) {
          case AccountAbstractionType.ERC4337:
            return EvmErc4337Wallet.from({
              ...opts,
              extra: {
                network
              }
            } as EvmErc4337WalletOpts)
        }
      }
      return
    }
    case NetworkKind.STARKNET:
      return StarknetWallet.from({
        ...opts
      })
    case NetworkKind.COSM: {
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
    case NetworkKind.ALEO:
      return AleoWallet.from(opts)
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

  const network = await NETWORK_SERVICE.getNetwork({
    kind: account.networkKind,
    chainId: account.chainId
  })
  assert(network)

  switch (account.networkKind) {
    case NetworkKind.BTC: {
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
        account.info.publicKey ||
          subWallet?.info.accounts?.[account.networkKind]?.publicKey
      )
    }
    case NetworkKind.EVM:
      const args = [
        wallet.hash,
        account.address!,
        {
          pathTemplate: wallet.info.pathTemplate!,
          derivePosition: wallet.info.derivePosition
        },
        wallet.type === WalletType.HW ? wallet.info.path! : account.index,
        account.info.publicKey ||
          subWallet?.info.accounts?.[account.networkKind]?.publicKey
      ] as [string, string, WalletPathSchema, string | number, string?]

      if (!wallet.info.accountAbstraction) {
        return new EvmHwWallet(...args)
      } else {
        switch (wallet.info.accountAbstraction.type) {
          case AccountAbstractionType.ERC4337:
            return await new EvmHwErc4337Wallet(network, ...args).prepare()
        }
      }
  }
}

export async function getSigningWallet(
  account: IChainAccount
): Promise<SigningWallet | undefined> {
  const master = await WALLET_SERVICE.getWallet(account.masterId)
  const subWallet = await WALLET_SERVICE.getSubWallet({
    masterId: account.masterId,
    index: account.index
  })
  assert(master && subWallet)

  if (hasWalletKeystore(master.type) || isKeylessWallet(master.type)) {
    let signingWallet = await getStructuralSigningWallet(
      master,
      subWallet,
      account.networkKind,
      account.chainId,
      true
    )
    if (!signingWallet) {
      return undefined
    }

    if (isHdWallet(master.type)) {
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
    return getHardwareSigningWallet(master, subWallet, account)
  }
}
