import { useCallback, useMemo, useState } from 'react'
import { useDebounce } from 'react-use'
// @ts-ignore
import stableHash from 'stable-hash'

import { StoreKey, useLocalStorage } from '~lib/store'

interface NetworkTreeState {
  offset: number // scroll offset
}

export function useInitialNetworkTreeState() {
  // load only once from localStorage
  return useMemo(() => {
    const stateStr = localStorage.getItem(StoreKey.NETWORK_TREE_STATE)
    if (stateStr) {
      try {
        return JSON.parse(stateStr) as NetworkTreeState
      } catch {}
    }
    return {
      offset: 0
    } as NetworkTreeState
  }, [])
}

export function useNetworkTreeState() {
  const initialState = useInitialNetworkTreeState()

  const [storedState, setStoredState] = useLocalStorage<NetworkTreeState>(
    StoreKey.NETWORK_TREE_STATE
  )

  const [state, _setState] = useState<NetworkTreeState>(initialState)

  useDebounce(
    () => {
      if (stableHash(state) !== stableHash(storedState)) {
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

  return {
    state,
    setScrollOffset
  }
}
