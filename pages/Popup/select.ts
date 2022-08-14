import Dexie from 'dexie'
import { useEffect, useState } from 'react'

import { DB } from '~lib/db'
import { IDerivedWallet, INetwork, IWallet } from '~lib/schema'
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

  const [activeWallet, setActiveWallet] = useState<
    | {
        master: IWallet
        derived: IDerivedWallet | undefined
      }
    | undefined
  >()

  useEffect(() => {
    const effect = async () => {
      console.log(activeId, selectedId, selectedSubId)
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
          setActiveWallet({ master, derived: undefined })
          return
        }

        if (selectedSubId === undefined) {
          return
        }
        const derived = await DB.derivedWallets.get(selectedSubId)
        await setActiveId({
          masterId: selectedId,
          derivedId: selectedSubId
        })
        setActiveWallet({ master, derived })
      }
    }

    effect()
  }, [
    selectedId,
    selectedSubId,
    setSelectedId,
    setSelectedSubId,
    setActiveId,
    activeId
  ])

  return {
    selectedId,
    selectedSubId,
    setSelectedId,
    setSelectedSubId,
    activeId,
    activeWallet
  }
}
