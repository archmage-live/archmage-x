import { useLiveQuery } from 'dexie-react-hooks'
import { atom, useAtom } from 'jotai'
import { useCallback } from 'react'

import {
  WalletId,
  getDefaultActiveNetwork,
  getDefaultActiveWallet,
  resetActiveNetwork,
  resetActiveWallet
} from '~lib/active'
import {
  ActiveBindingAccount,
  IChainAccount,
  INetwork,
  ISubWallet,
  IWallet
} from '~lib/schema'
import { useActiveBinding } from '~lib/services/activeBindingService'
import { NETWORK_SERVICE } from '~lib/services/network'
import { WALLET_SERVICE } from '~lib/services/wallet'
import { StoreKey, useLocalStorage } from '~lib/store'
import { useCurrentTab } from '~lib/tab'

function useActiveBindingAccount() {
  const tab = useCurrentTab()

  const { activeBinding, setActiveBinding } = useActiveBinding(
    tab?.url ? new URL(tab.url).origin : undefined,
    tab?.id
  )

  const setActiveBindingAccount = useCallback(
    async (account: ActiveBindingAccount) => {
      if (!tab?.url || typeof tab?.id !== 'number') {
        return
      }
      await setActiveBinding(new URL(tab.url).origin, tab.id, account)
    },
    [tab, setActiveBinding]
  )

  return {
    activeBindingAccount: activeBinding?.account,
    setActiveBindingAccount
  }
}

const networkAtom = atom<INetwork | undefined>(undefined)

export function useActiveNetworkBuild() {
  const { networkId } = useActiveNetworkId()

  const [network, setNetwork] = useAtom(networkAtom)

  useLiveQuery(async () => {
    if (networkId === undefined) {
      return
    }
    const network = await NETWORK_SERVICE.getNetwork(networkId)

    if (!network) {
      await Promise.resolve(resetActiveNetwork())
      return
    }

    setNetwork(network)
  }, [networkId])

  return network
}

export function useActiveNetworkId() {
  const {activeBindingAccount, setActiveBindingAccount} = useActiveBindingAccount()

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

    setWallet(wallet)
    setSubWallet(subWallet)
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

export function useActiveAccount() {
  const [account] = useAtom(accountAtom)
  return account
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
    // setAccount(undefined)
    const account = await WALLET_SERVICE.getChainAccount({
      masterId: wallet.id,
      networkKind: network.kind,
      chainId: network.chainId,
      index: subWallet.index
    })
    setAccount(account)
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
  const account = useActiveAccount()

  return {
    network,
    wallet,
    subWallet,
    account
  }
}
