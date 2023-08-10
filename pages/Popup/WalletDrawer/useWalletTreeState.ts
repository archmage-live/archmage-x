import { useCallback, useMemo, useState } from 'react'
import { useDebounce } from 'react-use'
// @ts-ignore
import stableHash from 'stable-hash'

import { StoreKey, useLocalStorage } from '~lib/store'

interface WalletTreeState {
  offset: number // scroll offset of parent list
  subOffsets: Record<number, number> // wallet id -> scroll offset
  isOpen: Record<number, boolean> // wallet id -> isOpen
}

export function useInitialWalletTreeState() {
  // load only once from localStorage
  return useMemo(() => {
    const stateStr = localStorage.getItem(StoreKey.WALLET_TREE_STATE)
    if (stateStr) {
      try {
        return JSON.parse(stateStr) as WalletTreeState
      } catch {}
    }
    return {
      offset: 0,
      subOffsets: {},
      isOpen: {}
    }
  }, [])
}

export function useWalletTreeState() {
  const initialState = useInitialWalletTreeState()

  const [storedState, setStoredState] = useLocalStorage<WalletTreeState>(
    StoreKey.WALLET_TREE_STATE
  )

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
