import Dexie from 'dexie'
import { useEffect, useState } from 'react'

import { ActiveWalletId } from '~lib/active'
import { DB } from '~lib/db'
import { INetwork, ISubWallet, IWallet } from '~lib/schema'
import {
  WALLET_SERVICE,
  useSubWallet,
  useWallet
} from '~lib/services/walletService'
import { StoreKey, useLocalStorage } from '~lib/store'

export function useSelectedNetwork() {
  const [selectedNetworkId, setSelectedNetworkId] = useLocalStorage<
    number | undefined
  >(StoreKey.SELECTED_NETWORK, async (selectedNetworkId) => {
    if (selectedNetworkId === undefined) {
      const firstNetwork = await DB.networks.orderBy('sortId').first()
      return firstNetwork?.id
    } else {
      return selectedNetworkId
    }
  })

  const [selectedNetwork, setSelectedNetwork] = useState<INetwork>()

  useEffect(() => {
    const effect = async () => {
      if (
        selectedNetworkId !== undefined &&
        selectedNetwork?.id !== selectedNetworkId
      ) {
        const network = await DB.networks.get(selectedNetworkId)
        setSelectedNetwork(network)
      }
    }

    effect()
  }, [selectedNetwork, selectedNetworkId, setSelectedNetworkId])

  return {
    selectedNetworkId,
    setSelectedNetworkId,
    selectedNetwork
  }
}

export function useActiveWallet() {
  const [activeId, setActiveId] = useLocalStorage<ActiveWalletId | undefined>(
    StoreKey.SELECTED_WALLET,
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
        derivedId: firstSubWallet.id
      }
    }
  )

  const [wallet, setWallet] = useState<IWallet | undefined>()
  const [subWallet, setSubWallet] = useState<ISubWallet | undefined>()
  useEffect(() => {
    const effect = async () => {
      if (!activeId) {
        return
      }
      const wallet = await WALLET_SERVICE.getWallet(activeId.masterId)
      const subWallet = await WALLET_SERVICE.getSubWallet(activeId.derivedId)
      setWallet(wallet)
      setSubWallet(subWallet)
    }
    effect()
  }, [activeId])

  return {
    activeId,
    setActiveId,
    wallet,
    subWallet
  }
}
