import { useCallback, useEffect, useState } from 'react'

import { DB } from '~lib/db'
import { IDerivedWallet, IWallet } from '~lib/schema'

export function useSelectedWallet() {
  const [id, setId] = useState<number>()
  const [subId, setSubId] = useState<number>()
  const [wallet, setWallet] = useState<IWallet>()
  const [subWallet, setSubWallet] = useState<IDerivedWallet>()

  useEffect(() => {
    if (id === undefined) {
      setWallet(undefined)
    } else {
      DB.wallets.get(id).then((w) => setWallet(w))
    }
  }, [id, setWallet])

  useEffect(() => {
    if (subId === undefined) {
      setSubWallet(undefined)
    } else {
      DB.derivedWallets.get(subId).then((w) => {
        setId(w?.masterId)
        setSubWallet(w)
      })
    }
  }, [setId, setSubWallet, subId])

  const setSelectedId = useCallback(
    (id: number) => {
      setId(id)
      setSubId(undefined)
    },
    [setId, setSubId]
  )

  return {
    selectedId: id,
    selectedSubId: subId,
    selectedWallet: wallet,
    selectedSubWallet: subWallet,
    setSelectedId,
    setSelectedSubId: setSubId
  }
}
