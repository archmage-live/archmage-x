import Dexie from 'dexie'
import { useEffect, useState } from 'react'

import { DB } from '~lib/db'
import { INetwork } from '~lib/schema'
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

export function useSelectedWallet() {
  const {
    selectedId,
    selectedSubId,
    selectedWallet,
    selectedSubWallet,
    setSelectedId,
    setSelectedSubId
  } = useVolatileSelectedWallet()

  const [storedSelectedWallet, setStoredSelectedWallet] = useLocalStorage<{
    masterId: number
    derivedId: number | undefined
  }>(StoreKey.SELECTED_WALLET)

  useEffect(() => {
    const effect = async () => {
      if (!storedSelectedWallet) {
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
          await setStoredSelectedWallet({
            masterId: firstWallet.id!,
            derivedId: firstSubWallet.id
          })
        } else {
          await setStoredSelectedWallet({
            masterId: firstWallet.id!,
            derivedId: undefined
          })
        }
      }
    }

    effect()
  }, [setStoredSelectedWallet, storedSelectedWallet])

  useEffect(() => {
    const effect = async () => {
      if (storedSelectedWallet && selectedId === undefined) {
        if (storedSelectedWallet.derivedId === undefined) {
          setSelectedId(storedSelectedWallet.masterId)
        } else {
          setSelectedSubId(storedSelectedWallet.derivedId)
        }
      } else if (
        selectedId !== undefined &&
        (storedSelectedWallet.masterId !== selectedId ||
          storedSelectedWallet.derivedId !== selectedSubId)
      ) {
        await setStoredSelectedWallet({
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
    setStoredSelectedWallet,
    storedSelectedWallet
  ])

  return {
    selectedId,
    selectedSubId,
    selectedWallet,
    selectedSubWallet,
    setSelectedId,
    setSelectedSubId
  }
}
