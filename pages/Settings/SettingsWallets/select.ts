import { useCallback, useEffect, useState } from 'react'

import { useSubWallet, useWallet } from '~lib/services/walletService'

export function useSelectedWallet() {
  const [id, setId] = useState<number>()
  const [subId, setSubId] = useState<number>()

  const wallet = useWallet(id)
  const subWallet = useSubWallet(subId)

  useEffect(() => {
    if (subWallet) {
      setId(subWallet.masterId)
    }
  }, [subWallet])

  const setSelectedId = useCallback(
    (id?: number) => {
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
