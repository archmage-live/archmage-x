import assert from 'assert'
import Dexie from 'dexie'
import { useEffect, useState } from 'react'

import { IChainAccount, INetwork, ISubWallet, IWallet } from '~lib/schema'
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

export async function getActiveNetwork(): Promise<INetwork | undefined> {
  const networkId = await LOCAL_STORE.get<number | undefined>(
    StoreKey.ACTIVE_NETWORK
  )
  if (networkId === undefined) {
    return undefined
  }
  return DB.networks.get(networkId)
}

export async function setActiveNetwork(networkId: number) {
  await LOCAL_STORE.set(StoreKey.ACTIVE_NETWORK, networkId)
}

export async function getActiveWallet(): Promise<
  | { wallet: IWallet; subWallet: ISubWallet; chainAccount: IChainAccount }
  | undefined
> {
  const network = await getActiveNetwork()
  if (!network) {
    return undefined
  }

  const activeId = await LOCAL_STORE.get<ActiveWalletId | undefined>(
    StoreKey.ACTIVE_WALLET
  )
  if (!activeId) {
    return undefined
  }

  const wallet = await DB.wallets.get(activeId.masterId)
  assert(wallet)

  const subWallet = await DB.subWallets.get(activeId.subId)
  assert(subWallet)

  const chainAccount = await WALLET_SERVICE.getChainAccount({
    masterId: wallet.id,
    index: subWallet.index,
    networkKind: network.kind,
    chainId: network.chainId
  })
  assert(chainAccount)

  return { wallet, subWallet, chainAccount }
}

export function useActiveNetwork() {
  const [networkId, setNetworkId] = useLocalStorage<number | undefined>(
    StoreKey.ACTIVE_NETWORK,
    async (activeNetworkId) => {
      if (activeNetworkId === undefined) {
        const firstNetwork = await DB.networks.orderBy('sortId').first()
        return firstNetwork?.id
      } else {
        return activeNetworkId
      }
    }
  )

  const [network, setNetwork] = useState<INetwork>()

  useEffect(() => {
    const effect = async () => {
      if (networkId !== undefined && network?.id !== networkId) {
        setNetwork(await DB.networks.get(networkId))
      }
    }

    effect()
  }, [network, networkId, setNetworkId])

  return {
    networkId,
    network,
    setNetworkId
  }
}

export function useActiveWallet() {
  const [walletId, setWalletId] = useLocalStorage<ActiveWalletId | undefined>(
    StoreKey.ACTIVE_WALLET,
    async (storedSelectedWallet) => {
      if (storedSelectedWallet !== undefined) {
        return storedSelectedWallet
      }
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
  )

  const [wallet, setWallet] = useState<IWallet | undefined>()
  const [subWallet, setSubWallet] = useState<ISubWallet | undefined>()
  useEffect(() => {
    const effect = async () => {
      if (!walletId) {
        return
      }
      const wallet = await WALLET_SERVICE.getWallet(walletId.masterId)
      const subWallet = await WALLET_SERVICE.getSubWallet(walletId.subId)
      setWallet(wallet)
      setSubWallet(subWallet)
    }
    effect()
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
