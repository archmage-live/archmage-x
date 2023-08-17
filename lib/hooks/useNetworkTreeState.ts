import { atom, useAtom } from 'jotai'
import { useCallback, useMemo, useState } from 'react'
import { useDebounce } from 'react-use'
import stableHash from 'stable-hash'

import { StoreKey, useLocalStorage } from '~lib/store'

interface NetworkTreeState {
  offset: number // scroll offset
}

const stateAtom = atom<NetworkTreeState | undefined>(undefined)

export function useInitialNetworkTreeState(usePersist: boolean = false) {
  const [memoryState] = useAtom(stateAtom)
  const [initialMemoryState] = useState<NetworkTreeState | undefined>(
    memoryState
  )

  // load only once from localStorage
  const initialPersistedState = useMemo(() => {
    const stateStr = localStorage.getItem(StoreKey.NETWORK_TREE_STATE)
    if (stateStr) {
      try {
        return JSON.parse(stateStr) as NetworkTreeState
      } catch {}
    }
  }, [])

  return useMemo(() => {
    const zeroState = {
      offset: 0
    } as NetworkTreeState

    return (
      (usePersist ? initialPersistedState : initialMemoryState) || zeroState
    )
  }, [usePersist, initialMemoryState, initialPersistedState])
}

export function useNetworkTreeState(usePersist: boolean = false) {
  const initialState = useInitialNetworkTreeState(usePersist)

  const [persistedState, setPersistedState] = useLocalStorage<NetworkTreeState>(
    StoreKey.NETWORK_TREE_STATE
  )
  const [memoryState, setMemoryState] = useAtom(stateAtom)
  const storedState = usePersist ? persistedState : memoryState
  const setStoredState = usePersist ? setPersistedState : setMemoryState

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
