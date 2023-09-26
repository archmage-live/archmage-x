import { fromBech32, toBech32 } from '@cosmjs/encoding'

import { NetworkKind } from '~lib/network'
import { CosmAppChainInfo } from '~lib/network/cosm'

import { IChainAccount } from './chainAccount'
import { INetwork } from './network'
import { ISubWallet, SubIndex } from './subWallet'
import { IWallet } from './wallet'

export * from './network'
export * from './wallet'
export * from './keystore'
export * from './hdPath'
export * from './subWallet'
export * from './chainAccount'
export * from './pendingTx'
export * from './transaction'
export * from './tokenList'
export * from './token'
export * from './connectedSite'
export * from './contact'
export * from './cache'
export * from './aptosEvent'
export * from './activeBinding'

export interface CompositeAccount {
  wallet: IWallet
  subWallet: ISubWallet
  account: IChainAccount
}

export function accountName(account: Omit<CompositeAccount, 'account'>) {
  return account.subWallet.name
    ? `${account.wallet.name} / ${account.subWallet.name}`
    : account.wallet.name
}

// https://dexie.org/docs/Indexable-Type
// non-indexable types:
//   boolean
//   undefined
//   Object
//   null

export function booleanToNumber(b: boolean) {
  return b ? 1 : 0
}

export function numberToBoolean(n: number) {
  return n !== 0
}

export function mapBySubIndex<T extends SubIndex>(
  array: T[]
): Map<number, Map<number, T>> {
  const map = new Map<number, Map<number, T>>()
  for (const item of array) {
    let m = map.get(item.masterId)
    if (!m) {
      m = new Map()
      map.set(item.masterId, m)
    }

    m.set(item.index, item)
  }
  return map
}

export function getAddressPrefix(network: INetwork): string | undefined {
  switch (network.kind) {
    case NetworkKind.COSM: {
      const info = network.info as CosmAppChainInfo
      return info.bech32Config.bech32PrefixAccAddr
    }
    default:
      return undefined
  }
}

export function getAddressFromInfo(
  subWallet: ISubWallet | string,
  network: INetwork
) {
  const address =
    typeof subWallet === 'string'
      ? subWallet
      : subWallet.info.accounts?.[network.kind]?.address

  if (!address) {
    return undefined
  }

  switch (network.kind) {
    case NetworkKind.COSM: {
      return toBech32(getAddressPrefix(network)!, fromBech32(address).data)
    }
    default:
      return address
  }
}

export function formatAddressForNetwork(
  address: string,
  networkKind: NetworkKind
) {
  switch (networkKind) {
    case NetworkKind.COSM: {
      return toBech32('cosmos', fromBech32(address).data)
    }
    default:
      return address
  }
}
