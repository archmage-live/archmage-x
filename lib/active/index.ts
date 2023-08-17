import assert from 'assert'
import Dexie from 'dexie'
import stableHash from 'stable-hash'

import { NetworkKind } from '~lib/network'
import { IChainAccount, INetwork, ISubWallet, IWallet } from '~lib/schema'
import { NETWORK_SERVICE } from '~lib/services/network'
import { WALLET_SERVICE } from '~lib/services/wallet'
import { LOCAL_STORE, StoreKey } from '~lib/store'

import { DB } from '../db'

export * from './hooks'
export * from './observe'

export interface WalletId {
  id: number
  subId: number
}

/**
 * Get the first available network as the active network,
 * if there's no stored one.
 */
export async function getDefaultActiveNetwork(): Promise<number | undefined> {
  const firstNetwork = await DB.networks.orderBy('sortId').first()
  return firstNetwork?.id
}

/**
 * Get the first available wallet & sub-wallet as the active wallet,
 * if there's no stored one.
 */
export async function getDefaultActiveWallet(): Promise<WalletId | undefined> {
  const wallets = await DB.wallets.orderBy('sortId').toArray()
  for (const firstWallet of wallets) {
    const firstSubWallet = await DB.subWallets
      .where('[masterId+sortId]')
      .between([firstWallet.id, Dexie.minKey], [firstWallet.id, Dexie.maxKey])
      .first()
    if (!firstSubWallet) {
      continue
    }
    return {
      id: firstWallet.id,
      subId: firstSubWallet.id
    }
  }
}

export async function getActiveNetworkByKind(
  kind: NetworkKind
): Promise<INetwork | undefined> {
  const network = await getActiveNetwork()
  if (network?.kind === kind) {
    return network
  }
  // if active network is not of the specified kind,
  // fallback to first network of that kind
  const networks = await NETWORK_SERVICE.getNetworks(kind)
  if (!networks.length) {
    return undefined
  }
  return networks[0]
}

export async function getActiveNetwork(): Promise<INetwork | undefined> {
  let networkId = await LOCAL_STORE.get<number | undefined>(
    StoreKey.ACTIVE_NETWORK
  )
  if (networkId === undefined) {
    networkId = await getDefaultActiveNetwork()
    if (networkId !== undefined) {
      await setActiveNetwork(networkId)
    }
  }
  if (networkId === undefined) {
    return undefined
  }

  const network = await NETWORK_SERVICE.getNetwork(networkId)

  if (!network) {
    await resetActiveNetwork()
  }

  return network
}

export async function setActiveNetwork(
  networkId: number,
  origin?: string,
  tabId?: number
) {
  await LOCAL_STORE.set(StoreKey.ACTIVE_NETWORK, networkId)
}

export async function resetActiveNetwork() {
  await LOCAL_STORE.remove(StoreKey.ACTIVE_NETWORK)
  await getActiveNetwork()
}

export async function getActiveWallet(): Promise<{
  wallet?: IWallet
  subWallet?: ISubWallet
}> {
  let activeId = await LOCAL_STORE.get<WalletId | undefined>(
    StoreKey.ACTIVE_WALLET
  )
  if (!activeId) {
    activeId = await getDefaultActiveWallet()
    if (activeId) {
      await setActiveWallet(activeId)
    }
  }
  if (!activeId) {
    return {}
  }

  const wallet = await WALLET_SERVICE.getWallet(activeId.id)
  const subWallet = await WALLET_SERVICE.getSubWallet(activeId.subId)

  if (!wallet || !subWallet) {
    await resetActiveWallet()
  }

  return { wallet, subWallet }
}

export async function setActiveWallet(activeId: WalletId) {
  await LOCAL_STORE.set(StoreKey.ACTIVE_WALLET, activeId)
}

export async function resetActiveWallet() {
  await LOCAL_STORE.remove(StoreKey.ACTIVE_WALLET)
  await getActiveWallet()
}

export async function getActive(): Promise<{
  network?: INetwork
  wallet?: IWallet
  subWallet?: ISubWallet
  account?: IChainAccount
}> {
  const network = await getActiveNetwork()
  if (!network) {
    return {}
  }

  const { wallet, subWallet } = await getActiveWallet()
  if (!wallet || !subWallet) {
    return { network }
  }

  const account = await WALLET_SERVICE.getChainAccount({
    masterId: wallet.id,
    index: subWallet.index,
    networkKind: network.kind,
    chainId: network.chainId
  })
  assert(account)

  return { network, wallet, subWallet, account }
}
