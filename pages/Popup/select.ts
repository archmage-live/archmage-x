import Dexie from 'dexie'
import { useEffect, useState } from 'react'

import { DB } from '~lib/db'
import { INetwork } from '~lib/schema'
import { useSubWallet, useWallet } from '~lib/services/walletService'
import { StoreKey, useLocalStorage } from '~lib/store'
import { WalletType } from '~lib/wallet'
import { useSelectedWallet as useVolatileSelectedWallet } from '~pages/Settings/SettingsWallets/select'

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

export interface ActiveId {
  masterId: number
  derivedId: number | undefined
}

export function useSelectedWallet() {
  const { selectedId, selectedSubId, setSelectedId, setSelectedSubId } =
    useVolatileSelectedWallet()

  const { activeId, setActiveId } = useActiveWallet()

  useEffect(() => {
    const effect = async () => {
      if (activeId && selectedId === undefined) {
        if (activeId.derivedId === undefined) {
          setSelectedId(activeId.masterId)
        } else {
          setSelectedSubId(activeId.derivedId)
        }
      } else if (
        selectedId !== undefined &&
        (activeId.masterId !== selectedId ||
          activeId.derivedId !== selectedSubId)
      ) {
        const master = await DB.wallets.get(selectedId)
        if (!master) {
          return
        }
        if (master.type !== WalletType.HD) {
          await setActiveId({
            masterId: selectedId,
            derivedId: undefined
          })
          return
        }

        if (selectedSubId === undefined) {
          return
        }
        await setActiveId({
          masterId: selectedId,
          derivedId: selectedSubId
        })
      }
    }

    effect()
  }, [
    selectedId,
    selectedSubId,
    setSelectedId,
    setSelectedSubId,
    activeId,
    setActiveId
  ])

  return {
    selectedId,
    selectedSubId,
    setSelectedId,
    setSelectedSubId,
    activeId
  }
}

export function useActiveWallet() {
  const [activeId, setActiveId] = useLocalStorage<ActiveId | undefined>(
    StoreKey.SELECTED_WALLET,
    async (storedSelectedWallet) => {
      if (storedSelectedWallet !== undefined) {
        return storedSelectedWallet
      }
      const firstWallet = await DB.wallets.orderBy('sortId').first()
      if (!firstWallet) {
        return
      }
      if (firstWallet.type === WalletType.HD) {
        const firstSubWallet = await DB.derivedWallets
          .where('[masterId+sortId]')
          .between(
            [firstWallet.id, Dexie.minKey],
            [firstWallet.id, Dexie.maxKey]
          )
          .first()
        if (!firstSubWallet) {
          return
        }
        return {
          masterId: firstWallet.id!,
          derivedId: firstSubWallet.id
        }
      } else {
        return {
          masterId: firstWallet.id!,
          derivedId: undefined
        }
      }
    }
  )

  const wallet = useWallet(activeId?.masterId)
  const subWallet = useSubWallet(activeId?.derivedId)

  return {
    activeId,
    setActiveId,
    wallet,
    subWallet
  }
}
