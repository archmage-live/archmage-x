import { useLiveQuery } from 'dexie-react-hooks'
import { atom, useAtom } from 'jotai'
import { useCallback, useMemo, useState } from 'react'
import { useDebounce } from 'react-use'
import stableHash from 'stable-hash'

import { WALLET_SERVICE } from '~lib/services/wallet'
import { StoreKey, useLocalStorage } from '~lib/store'

interface WalletTreeState {
  offset: number // scroll offset of parent list
  subOffsets: Record<number, number> // wallet id -> scroll offset
  isOpen: Record<number, boolean> // wallet id -> isOpen
}

const stateAtom = atom<WalletTreeState | undefined>(undefined)

export function useInitialWalletTreeState(usePersist: boolean = false) {
  const [memoryState] = useAtom(stateAtom)
  const [initialMemoryState] = useState<WalletTreeState | undefined>(
    memoryState
  )

  // load only once from localStorage
  const initialPersistedState = useMemo(() => {
    const stateStr = localStorage.getItem(StoreKey.WALLET_TREE_STATE)
    if (stateStr) {
      try {
        return JSON.parse(stateStr) as WalletTreeState
      } catch {}
    }
  }, [])

  return useMemo(() => {
    const zeroState = {
      offset: 0,
      subOffsets: {},
      isOpen: {}
    } as WalletTreeState

    return (
      (usePersist ? initialPersistedState : initialMemoryState) || zeroState
    )
  }, [usePersist, initialMemoryState, initialPersistedState])
}

export function useWalletTreeState(usePersist: boolean = false) {
  const initialState = useInitialWalletTreeState(usePersist)

  const [persistedState, setPersistedState] = useLocalStorage<WalletTreeState>(
    StoreKey.WALLET_TREE_STATE
  )
  const [memoryState, setMemoryState] = useAtom(stateAtom)
  const storedState = usePersist ? persistedState : memoryState
  const setStoredState = usePersist ? setPersistedState : setMemoryState

  const [state, _setState] = useState<WalletTreeState>(initialState)

  useDebounce(
    () => {
      if (stableHash(state) !== stableHash(storedState)) {
        // console.log(state, storedState)
        setStoredState(state)
      }
    },
    300,
    [storedState, state]
  )

  useLiveQuery(async () => {
    const wallets = await WALLET_SERVICE.getWallets()

    // update state when wallets changed
    _setState((sc) => {
      const subOffsets: Record<number, number> = {}
      const isOpen: Record<number, boolean> = {}
      for (const wallet of wallets) {
        const offset = sc.subOffsets[wallet.id] as number | undefined
        const open = sc.isOpen[wallet.id] as boolean | undefined
        if (typeof offset === 'number') {
          subOffsets[wallet.id] = offset
        }
        if (typeof open === 'boolean') {
          isOpen[wallet.id] = open
        }
      }
      if (
        stableHash(subOffsets) === stableHash(sc.subOffsets) &&
        stableHash(isOpen) === stableHash(sc.isOpen)
      ) {
        // not changed
        return sc
      }
      return {
        ...sc,
        subOffsets,
        isOpen
      }
    })
  }, [])

  const setScrollOffset = useCallback((offset: number) => {
    _setState((sc) => {
      if (offset === sc.offset) {
        return sc
      }
      return {
        ...sc,
        offset: offset
      }
    })
  }, [])

  const setSubScrollOffset = useCallback((walletId: number, offset: number) => {
    _setState((sc) => {
      if (offset === sc.subOffsets[walletId]) {
        return sc
      }
      return {
        ...sc,
        subOffsets: {
          ...sc.subOffsets,
          [walletId]: offset
        }
      }
    })
  }, [])

  const setOpen = useCallback((walletId: number, isOpen: boolean) => {
    _setState((sc) => {
      if (isOpen === sc.isOpen[walletId]) {
        return sc
      }
      return {
        ...sc,
        isOpen: {
          ...sc.isOpen,
          [walletId]: isOpen
        }
      }
    })
  }, [])

  const toggleOpen = useCallback((walletId: number) => {
    _setState((sc) => {
      const isOpen = !sc.isOpen[walletId]
      return {
        ...sc,
        isOpen: {
          ...sc.isOpen,
          [walletId]: isOpen
        }
      }
    })
  }, [])

  return {
    state,
    setScrollOffset,
    setSubScrollOffset,
    setOpen,
    toggleOpen
  }
}
