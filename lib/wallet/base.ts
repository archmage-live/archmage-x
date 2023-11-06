import { Slip10RawIndex, pathToString, stringToPath } from '@cosmjs/crypto'
import type { _KeystoreAccount } from '@ethersproject/json-wallets/lib.esm/keystore'
import type { KeystoreAccount } from '@ethersproject/json-wallets/lib/keystore'
import { SafeAccountConfig } from '@safe-global/protocol-kit/dist/src/types'
import assert from 'assert'
import safeLogo from 'data-base64:~assets/thirdparty/Safe_Logos_H-Lockup_Black.svg'
import walletConnectLogo from 'data-base64:~assets/thirdparty/walletconnect.svg'
import web3authLogo from 'data-base64:~assets/thirdparty/web3auth-favicon.svg'
import { ethers } from 'ethers'

import { Erc4337AccountType } from '~lib/erc4337'
import { NetworkKind } from '~lib/network'
import { SafeVersion } from '~lib/safe'
import {
  ChainId,
  DerivePosition,
  IHdPath,
  IWallet,
  Index,
  SubIndex
} from '~lib/schema'

export enum WalletType {
  HD = 'hd', // Hierarchical Deterministic, derived from mnemonic

  PRIVATE_KEY = 'private_key', // private key (maybe derived from mnemonic)
  PRIVATE_KEY_GROUP = 'private_key_group', // ditto, but in group

  HW = 'hw', // hardware
  HW_GROUP = 'hw_group', // ditto, but in group

  WALLET_CONNECT = 'wallet_connect', // WalletConnect protocol
  WALLET_CONNECT_GROUP = 'wallet_connect_group', // ditto, but in group

  WATCH = 'watch', // only watch, no signing
  WATCH_GROUP = 'watch_group', // ditto, but in group

  MULTI_SIG = 'multi_sig', // multi-sig
  MULTI_SIG_GROUP = 'multi_sig_group', // ditto, but in group

  KEYLESS = 'keyless', // keyless wallet
  KEYLESS_HD = 'keyless_hd', // Hierarchical Deterministic, derived from keyless wallet private key (as seed)
  KEYLESS_GROUP = 'keyless_group' // ditto, but in group
}

export function isWalletGroup(type: WalletType) {
  switch (type) {
    case WalletType.HD:
    // pass through
    case WalletType.PRIVATE_KEY_GROUP:
    // pass through
    case WalletType.WATCH_GROUP:
    // pass through
    case WalletType.HW_GROUP:
    // pass through
    case WalletType.KEYLESS_HD:
    // pass through
    case WalletType.KEYLESS_GROUP:
    // pass through
    case WalletType.WALLET_CONNECT_GROUP:
    // pass through
    case WalletType.MULTI_SIG_GROUP:
      return true
    default:
      return false
  }
}

export function hasWalletKeystore(type: WalletType) {
  return hasMasterKeystore(type) || hasSubKeystore(type)
}

export function hasMasterKeystore(type: WalletType) {
  switch (type) {
    case WalletType.HD:
    // pass through
    case WalletType.PRIVATE_KEY:
      return true
    default:
      return false
  }
}

export function hasSubKeystore(type: WalletType) {
  switch (type) {
    case WalletType.PRIVATE_KEY_GROUP:
      return true
    default:
      return false
  }
}

export function isHdWallet(type: WalletType) {
  switch (type) {
    case WalletType.HD:
    // pass through
    case WalletType.KEYLESS_HD:
      return true
    default:
      return false
  }
}

export function isWatchWallet(type: WalletType) {
  switch (type) {
    case WalletType.WATCH:
    // pass through
    case WalletType.WATCH_GROUP:
      return true
    default:
      return false
  }
}

export function isMultisigWallet(type: WalletType) {
  switch (type) {
    case WalletType.MULTI_SIG:
    case WalletType.MULTI_SIG_GROUP:
      return true
    default:
      return false
  }
}

export function isKeylessWallet(type: WalletType) {
  switch (type) {
    case WalletType.KEYLESS_HD:
    case WalletType.KEYLESS:
    case WalletType.KEYLESS_GROUP:
      return true
    default:
      return false
  }
}

export function isAccountAbstractionWallet(wallet: IWallet) {
  return !!wallet.info.accountAbstraction
}

export function isHardwareWallet(type: WalletType) {
  switch (type) {
    case WalletType.HW:
    // pass through
    case WalletType.HW_GROUP:
      return true
    default:
      return false
  }
}

export function isWalletConnectProtocol(type: WalletType) {
  switch (type) {
    case WalletType.WALLET_CONNECT:
    // pass through
    case WalletType.WALLET_CONNECT_GROUP:
      return true
    default:
      return false
  }
}

export function canWalletSign(type: WalletType) {
  return (
    hasWalletKeystore(type) ||
    isKeylessWallet(type) ||
    isHardwareWallet(type) ||
    isWalletConnectProtocol(type)
  )
}

export function getWalletTypeIdentifier(wallet: IWallet): {
  identifier?: string
  logo?: string
  logoLight?: string
  logoDark?: string
  logoLightInvert?: boolean
  logoDarkInvert?: boolean
  logoHeight?: string | number
} {
  let identifier = undefined
  let logo = undefined
  let logoLight = undefined
  let logoDark = undefined
  let logoLightInvert = undefined
  let logoDarkInvert = undefined
  let logoHeight = undefined
  switch (wallet.type) {
    case WalletType.HD:
      identifier = 'HD'
      break
    case WalletType.PRIVATE_KEY:
      identifier = '' // empty for simple wallet
      break
    case WalletType.PRIVATE_KEY_GROUP:
      identifier = 'PrivKey Group'
      break
    case WalletType.WATCH:
      identifier = 'Watch'
      break
    case WalletType.WATCH_GROUP:
      identifier = 'Watch Group'
      break
    case WalletType.HW:
      identifier = wallet.info.hwType as string
      break
    case WalletType.HW_GROUP:
      identifier = wallet.info.hwType + ' Group'
      break
    case WalletType.WALLET_CONNECT:
    // pass through
    case WalletType.WALLET_CONNECT_GROUP:
      logo = walletConnectLogo
      break
    case WalletType.MULTI_SIG:
    // pass through
    case WalletType.MULTI_SIG_GROUP:
      logo = safeLogo
      logoDarkInvert = true
      logoHeight = '20px'
      break
    case WalletType.KEYLESS_HD:
      identifier = 'HD'
    // pass through
    case WalletType.KEYLESS:
    // pass through
    case WalletType.KEYLESS_GROUP:
      logo = web3authLogo
      logoHeight = '20px'
      break
  }
  return {
    identifier,
    logo,
    logoLight,
    logoDark,
    logoLightInvert,
    logoDarkInvert,
    logoHeight
  }
}

export function getWalletTypeTitle(wallet: IWallet) {
  switch (wallet.type) {
    case WalletType.HD:
      return 'Hierarchical Deterministic (HD)'
    case WalletType.PRIVATE_KEY:
      return 'Private-key'
    case WalletType.PRIVATE_KEY_GROUP:
      return 'Private-key Group'
    case WalletType.WATCH:
      return 'Watch Address'
    case WalletType.WATCH_GROUP:
      return 'Watch Address Group'
    case WalletType.HW:
      return 'Connected ' + wallet.info.hwType
    case WalletType.HW_GROUP:
      return 'Connected ' + wallet.info.hwType
    case WalletType.WALLET_CONNECT:
      return 'WalletConnect'
    case WalletType.WALLET_CONNECT_GROUP:
      return 'WalletConnect Group'
    case WalletType.MULTI_SIG:
      return 'MultiSig'
    case WalletType.MULTI_SIG_GROUP:
      return 'MultiSig Group'
    case WalletType.KEYLESS_HD:
      return 'Keyless Hierarchical Deterministic (HD)'
    case WalletType.KEYLESS:
      return 'Keyless'
    case WalletType.KEYLESS_GROUP:
      return 'Keyless Group'
  }
}

export function getMultisigTypeTitle(wallet: IWallet) {
  switch (wallet.info.multisigType) {
    case MultisigWalletType.SAFE:
      return 'Safe'
  }
}

export interface AccountInfo {
  // the same in all networks under the specified network kind;
  // for Cosmos, always has prefix 'cosmos',
  // so may need to be bech32 decoded and encoded.
  address: string
  publicKey?: string
  // if chainId is specified, the address is for the specific chain
  chainId?: ChainId
}

// accounts for various network kinds stored inside the sub wallet
export type AccountsInfo = Partial<Record<NetworkKind, AccountInfo>>

export enum HardwareWalletType {
  LEDGER = 'Ledger',
  TREZOR = 'Trezor'
}

export enum MultisigWalletType {
  SAFE = 'safe'
}

export enum AccountAbstractionType {
  ERC4337 = 'erc4337',
  SAFE = 'safe'
}

export interface AccountAbstractionInfo {
  type: AccountAbstractionType
}

// info of ERC4337 based account abstraction
export interface Erc4337Info {
  type: Erc4337AccountType
}

// info of Safe{Core} Protocol based account abstraction
export interface SafeInfo {
  safeVersion: SafeVersion
  threshold: number
  owners: SafeOwner[]
  setupConfig: Omit<SafeAccountConfig, 'threshold' | 'owners'>
  saltNonce?: string // uint256 string or its hex string; may be not found for imported Safe Account
  isL1SafeMasterCopy?: boolean
}

export interface SafeOwner {
  name: string
  address: string // ethereum address
  associated?: SubIndex
}

export interface StarknetInfo {
  type: StarknetAccountType
  info:
    | StarknetAccountArgentInfo
    | StarknetAccountBraavosInfo
    | StarknetAccountOzInfo
}

export enum StarknetAccountType {
  ARGENT = 'argent',
  BRAAVOS = 'braavos',
  OZ = 'oz' // OpenZeppelin
}

export interface StarknetAccountArgentInfo {
  publicKey: string
  contractClassHash: string
  accountClassHash: string
}

export interface StarknetAccountBraavosInfo {
  publicKey: string
  proxyClassHash: string
  initialClassHash: string
}

export interface StarknetAccountOzInfo {
  publicKey: string
  contractClassHash: string
}

export enum KeylessWalletType {
  WEB3AUTH = 'Web3Auth'
}

export interface KeylessWalletInfo {
  type: KeylessWalletType
  loginProvider: string
  name: string
  imageUrl?: string
}

export interface WalletAccount {
  index: Index
  hash: string

  addresses?: AccountsInfo

  mnemonic?: string
  path?: string
  privateKey?: string

  erc4337?: Erc4337Info

  safe?: SafeInfo

  keyless?: KeylessWalletInfo
}

export type DecryptedKeystoreAccount = {
  index: Index
  account: _KeystoreAccount
}

export interface WalletOpts {
  type: WalletType
  path?: string
  extra?: any

  keystore: KeystoreAccount
}

export interface WalletPathSchema {
  pathTemplate: string
  derivePosition?: DerivePosition
}

export interface SigningWallet {
  address: string
  privateKey?: string
  publicKey?: string

  signTransaction(transaction: any, ...args: any[]): Promise<any>

  signMessage(message: any): Promise<any>

  signTypedData(typedData: any): Promise<any>
}

export interface KeystoreSigningWallet extends SigningWallet {
  privateKey: string
  publicKey: string

  derive(
    pathTemplate: string,
    index: number,
    derivePosition?: DerivePosition
  ): Promise<KeystoreSigningWallet>
}

export interface Erc4337Wallet {
  owner: string
}

export function getDefaultDerivePosition(
  networkKind: NetworkKind
): DerivePosition {
  switch (networkKind) {
    case NetworkKind.BTC:
      return DerivePosition.ACCOUNT
    case NetworkKind.APTOS:
      return DerivePosition.ACCOUNT
    case NetworkKind.SUI:
      return DerivePosition.ACCOUNT
    default:
      return DerivePosition.ADDRESS_INDEX
  }
}

export function getDerivePosition(
  hdPath: IHdPath,
  networkKind: NetworkKind
): DerivePosition {
  return hdPath.info?.derivePosition || getDefaultDerivePosition(networkKind)
}

export function generatePath(
  pathTemplate: string,
  index: number,
  derivePosition?: DerivePosition
) {
  const path = stringToPath(pathTemplate)
  if (!derivePosition) {
    derivePosition = DerivePosition.ADDRESS_INDEX
  }
  assert(derivePosition < path.length)
  const component = path[derivePosition].isHardened()
    ? Slip10RawIndex.hardened(index)
    : Slip10RawIndex.normal(index)
  return pathToString([
    ...(path.slice(0, derivePosition) || []),
    component,
    ...(path.slice(derivePosition + 1) || [])
  ])
}

export function buildWalletUniqueHash(
  wallet: IWallet,
  keystoreAccounts?: DecryptedKeystoreAccount[],
  accounts?: WalletAccount[],
  hash?: string
) {
  let prefix: string = wallet.type

  const aa = wallet.info.accountAbstraction
  if (aa) {
    prefix += `-aa-${aa.type}`
  }

  switch (wallet.type) {
    case WalletType.HD:
      hash = keystoreAccounts![0].account.address
      break
    case WalletType.PRIVATE_KEY:
      hash = keystoreAccounts![0].account.address
      break
    case WalletType.PRIVATE_KEY_GROUP:
      hash = generateWalletUniqueHash()
      break
    case WalletType.WATCH:
      hash = accounts![0].hash
      break
    case WalletType.WATCH_GROUP:
      hash = generateWalletUniqueHash()
      break
    case WalletType.WALLET_CONNECT:
      hash = accounts![0].hash
      break
    case WalletType.WALLET_CONNECT_GROUP:
      hash = generateWalletUniqueHash()
      break
    case WalletType.KEYLESS:
      hash = accounts![0].hash
      break
    case WalletType.KEYLESS_HD:
      assert(hash)
      break
    case WalletType.KEYLESS_GROUP:
      hash = generateWalletUniqueHash()
      break
    case WalletType.HW:
      hash = accounts![0].hash
      break
    case WalletType.HW_GROUP:
      // read from hardware wallet
      assert(hash)
      break
    case WalletType.MULTI_SIG:
      hash = accounts![0].hash
      break
    case WalletType.MULTI_SIG_GROUP:
      hash = generateWalletUniqueHash()
      break
  }

  return `${prefix}-${hash}`
}

function generateWalletUniqueHash() {
  return ethers.utils.getAddress(
    ethers.utils.hexDataSlice(
      ethers.utils.keccak256(ethers.utils.randomBytes(32)),
      12
    )
  )
}

export function extractWalletHash(hash: string) {
  return hash.split('-').pop()
}
