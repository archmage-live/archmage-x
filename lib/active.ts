import assert from 'assert'
import Dexie from 'dexie'
import { useAsync } from 'react-use'

import { NetworkKind } from '~lib/network'
import { IChainAccount, INetwork, ISubWallet, IWallet } from '~lib/schema'
import { NETWORK_SERVICE } from '~lib/services/network'
import {
  WALLET_SERVICE,
  useChainAccountByIndex
} from '~lib/services/walletService'
import { LOCAL_STORE, StoreKey, useLocalStorage } from '~lib/store'

import { DB } from './db'

export interface ActiveWalletId {
  masterId: number
  subId: number
}

async function getDefaultActiveNetwork(): Promise<number | undefined> {
  const firstNetwork = await DB.networks.orderBy('sortId').first()
  return firstNetwork?.id
}

async function getDefaultActiveWallet(): Promise<ActiveWalletId | undefined> {
  const firstWallet = await DB.wallets.orderBy('sortId').first()
  if (!firstWallet) {
    return
  }
  const firstSubWallet = await DB.subWallets
    .where('[masterId+sortId]')
    .between([firstWallet.id, Dexie.minKey], [firstWallet.id, Dexie.maxKey])
    .first()
  if (!firstSubWallet) {
    return
  }
  return {
    masterId: firstWallet.id,
    subId: firstSubWallet.id
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
  return DB.networks.get(networkId)
}

export async function setActiveNetwork(networkId: number) {
  await LOCAL_STORE.set(StoreKey.ACTIVE_NETWORK, networkId)
}

export async function getActiveWallet(): Promise<{
  wallet?: IWallet
  subWallet?: ISubWallet
}> {
  let activeId = await LOCAL_STORE.get<ActiveWalletId | undefined>(
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

  const wallet = await WALLET_SERVICE.getWallet(activeId.masterId)
  const subWallet = await WALLET_SERVICE.getSubWallet(activeId.subId)
  assert(wallet)
  assert(subWallet)

  return { wallet, subWallet }
}

export async function setActiveWallet(activeId: ActiveWalletId) {
  await LOCAL_STORE.set(StoreKey.ACTIVE_WALLET, activeId)
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

export function watchActiveNetworkChange(handler: () => void) {
  LOCAL_STORE.watch({
    [StoreKey.ACTIVE_NETWORK]: handler
  })
}

export function watchActiveWalletChange(handler: () => void) {
  LOCAL_STORE.watch({
    [StoreKey.ACTIVE_WALLET]: handler
  })
}

export function useActiveNetwork() {
  const [networkId, setNetworkId] = useLocalStorage<number | undefined>(
    StoreKey.ACTIVE_NETWORK,
    async (storedActiveNetwork) => {
      if (storedActiveNetwork !== undefined) {
        return storedActiveNetwork
      }
      return getDefaultActiveNetwork()
    }
  )

  const { value: network } = useAsync(async () => {
    if (networkId !== undefined) {
      return DB.networks.get(networkId)
    }
  }, [networkId])

  return {
    networkId,
    network,
    setNetworkId
  }
}

export function useActiveWallet() {
  const [walletId, setWalletId] = useLocalStorage<ActiveWalletId | undefined>(
    StoreKey.ACTIVE_WALLET,
    async (storedActiveWallet) => {
      if (storedActiveWallet !== undefined) {
        return storedActiveWallet
      }
      return await getDefaultActiveWallet()
    }
  )

  const {
    value: { wallet, subWallet } = { wallet: undefined, subWallet: undefined }
  } = useAsync(async () => {
    if (!walletId) {
      return
    }
    const wallet = await WALLET_SERVICE.getWallet(walletId.masterId)
    const subWallet = await WALLET_SERVICE.getSubWallet(walletId.subId)
    return { wallet, subWallet }
  }, [walletId])

  return {
    walletId,
    setWalletId,
    wallet,
    subWallet
  }
}

export function useActive() {
  const { network } = useActiveNetwork()
  const { wallet, subWallet } = useActiveWallet()
  const account = useChainAccountByIndex(
    wallet?.id,
    network?.kind,
    network?.chainId,
    subWallet?.index
  )
  return {
    network,
    wallet,
    subWallet,
    account
  }
}
