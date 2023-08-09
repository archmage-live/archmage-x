import { useCallback, useMemo, useState } from 'react'
import { useDebounce } from 'react-use'
// @ts-ignore
import stableHash from 'stable-hash'

import { StoreKey, useLocalStorage } from '~lib/store'

interface ScrollOffset {
  offset: number
  subOffsets: Record<number, number> // wallet id -> offset
}

export function useScrollOffset() {
  // load only once from localStorage
  return useMemo(() => {
    const scrollOffsetStr = localStorage.getItem(
      StoreKey.WALLET_LIST_SCROLL_OFFSET
    )
    if (scrollOffsetStr) {
      try {
        return JSON.parse(scrollOffsetStr) as ScrollOffset
      } catch {}
    }
    return {
      offset: 0,
      subOffsets: {}
    }
  }, [])
}

export function useSetScrollOffset() {
  const initialScrollOffset = useScrollOffset()

  const [storedScrollOffset, setStoredScrollOffset] =
    useLocalStorage<ScrollOffset>(StoreKey.WALLET_LIST_SCROLL_OFFSET)

  const [scrollOffset, _setScrollOffset] =
    useState<ScrollOffset>(initialScrollOffset)

  useDebounce(
    () => {
      if (stableHash(scrollOffset) !== stableHash(storedScrollOffset)) {
        // console.log(scrollOffset, storedScrollOffset)
        setStoredScrollOffset(scrollOffset)
      }
    },
    300,
    [storedScrollOffset, scrollOffset]
  )

  const setScrollOffset = useCallback((offset: number) => {
    _setScrollOffset((sc) => {
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
    _setScrollOffset((sc) => {
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

  return {
    setScrollOffset,
    setSubScrollOffset
  }
}
