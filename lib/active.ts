import assert from 'assert'
import Dexie from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { atom, useAtom } from 'jotai'
// @ts-ignore
import stableHash from 'stable-hash'

import { NetworkKind } from '~lib/network'
import { IChainAccount, INetwork, ISubWallet, IWallet } from '~lib/schema'
import { NETWORK_SERVICE } from '~lib/services/network'
import { WALLET_SERVICE } from '~lib/services/walletService'
import { LOCAL_STORE, StoreKey, useLocalStorage } from '~lib/store'

import { DB } from './db'

export interface WalletId {
  id: number
  subId: number
}

async function getDefaultActiveNetwork(): Promise<number | undefined> {
  const firstNetwork = await DB.networks.orderBy('sortId').first()
  return firstNetwork?.id
}

async function getDefaultActiveWallet(): Promise<WalletId | undefined> {
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
  return DB.networks.get(networkId)
}

export async function setActiveNetwork(networkId: number) {
  await LOCAL_STORE.set(StoreKey.ACTIVE_NETWORK, networkId)
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

const networkAtom = atom<INetwork | undefined>(undefined)

export function useActiveNetworkBuild() {
  const { networkId } = useActiveNetworkId()

  const [network, setNetwork] = useAtom(networkAtom)

  useLiveQuery(async () => {
    if (networkId !== undefined) {
      const network = await NETWORK_SERVICE.getNetwork(networkId)
      setNetwork((oldNetwork) => {
        if (network && oldNetwork && isSameNetwork(network, oldNetwork)) {
          return oldNetwork
        }
        return network
      })
      return
    }
    if ((await Promise.resolve(getDefaultActiveNetwork())) === undefined) {
      setNetwork(undefined)
    }
  }, [networkId])

  return network
}

export function useActiveNetworkId() {
  const [networkId, setNetworkId] = useLocalStorage<number | undefined>(
    StoreKey.ACTIVE_NETWORK,
    async (storedActiveNetwork) => {
      if (storedActiveNetwork !== undefined) {
        return storedActiveNetwork
      }
      return getDefaultActiveNetwork()
    }
  )

  return { networkId, setNetworkId }
}

export function useActiveNetwork() {
  const [network] = useAtom(networkAtom)
  return network
}

const walletAtom = atom<IWallet | undefined>(undefined)
const subWalletAtom = atom<ISubWallet | undefined>(undefined)
const accountAtom = atom<IChainAccount | undefined>(undefined)

export function useActiveWalletBuild() {
  const { walletId } = useActiveWalletId()

  const [wallet, setWallet] = useAtom(walletAtom)
  const [subWallet, setSubWallet] = useAtom(subWalletAtom)

  useLiveQuery(async () => {
    if (!walletId) {
      return
    }
    const wallet = await WALLET_SERVICE.getWallet(walletId.id)
    const subWallet = await WALLET_SERVICE.getSubWallet(walletId.subId)

    if (!wallet || !subWallet) {
      await Promise.resolve(resetActiveWallet())
      return
    }

    setWallet((oldWallet) => {
      if (oldWallet && isSameWallet(wallet, oldWallet)) {
        return oldWallet
      }
      return wallet
    })
    setSubWallet((oldSubWallet) => {
      if (oldSubWallet && isSameSubWallet(subWallet, oldSubWallet)) {
        return oldSubWallet
      }
      return subWallet
    })
  }, [walletId])

  return {
    wallet,
    subWallet
  }
}

export function useActiveWalletId() {
  const [walletId, setWalletId] = useLocalStorage<WalletId | undefined>(
    StoreKey.ACTIVE_WALLET,
    async (storedActiveWallet) => {
      if (storedActiveWallet !== undefined) {
        return storedActiveWallet
      }
      return await getDefaultActiveWallet()
    }
  )

  return { walletId, setWalletId }
}

export function useActiveWallet() {
  const [wallet] = useAtom(walletAtom)
  const [subWallet] = useAtom(subWalletAtom)
  return { wallet, subWallet }
}

export function useActiveBuild() {
  const network = useActiveNetworkBuild()
  const { wallet, subWallet } = useActiveWalletBuild()

  const [account, setAccount] = useAtom(accountAtom)

  useLiveQuery(async () => {
    if (!network || !wallet || !subWallet) {
      setAccount(undefined)
      return
    }
    const account = await WALLET_SERVICE.getChainAccount({
      masterId: wallet.id,
      networkKind: network.kind,
      chainId: network.chainId,
      index: subWallet.index
    })
    setAccount((oldAccount) => {
      if (account && oldAccount && isSameAccount(account, oldAccount)) {
        return oldAccount
      }
      return account
    })
  }, [network, wallet, subWallet])

  return {
    network,
    wallet,
    subWallet,
    account
  }
}

export function useActive() {
  const network = useActiveNetwork()
  const { wallet, subWallet } = useActiveWallet()
  const [account] = useAtom(accountAtom)

  return {
    network,
    wallet,
    subWallet,
    account
  }
}

export function isSameNetwork(a: INetwork, b: INetwork) {
  return (
    a.id === b.id &&
    a.sortId === b.sortId &&
    stableHash(a.info) === stableHash(b.info) &&
    stableHash(a.search) === stableHash(b.search)
  )
}

export function isSameWallet(a: IWallet, b: IWallet) {
  return a.id === b.id && a.sortId === b.sortId && a.name === b.name
}

export function isSameSubWallet(a: ISubWallet, b: ISubWallet) {
  return a.id === b.id && a.sortId === b.sortId && a.name === b.name
}

export function isSameAccount(a: IChainAccount, b: IChainAccount) {
  return a.id === b.id && stableHash(a.info) === stableHash(b.info)
}
