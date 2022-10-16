import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo } from 'react'
import { useAsyncRetry } from 'react-use'

import { NetworkKind } from '~lib/network'
import { IChainAccount, INetwork } from '~lib/schema'
import { formatEvmTransactions } from '~lib/services/transaction/evmService'
import { getTransactionService } from '~lib/services/transaction/index'

export function usePendingTxCount(account?: IChainAccount) {
  return useLiveQuery(() => {
    if (account === undefined) {
      return
    }
    return getTransactionService(account.networkKind).getPendingTxCount(account)
  }, [account])
}

export function useTransactionCount(type: string, account?: IChainAccount) {
  return useLiveQuery(() => {
    if (account === undefined) {
      return
    }
    return getTransactionService(account.networkKind).getTransactionCount(
      account,
      type
    )
  }, [account, type])
}

export function usePendingTxs(
  network?: INetwork,
  account?: IChainAccount,
  count?: number
) {
  return useLiveQuery(async () => {
    if (account === undefined || count === undefined) {
      return
    }
    let txs = await getTransactionService(account.networkKind).getPendingTxs(
      account,
      count
    )
    if (account.networkKind === NetworkKind.EVM) {
      txs = formatEvmTransactions(txs)
    }
    return txs
  }, [account, count])
}

export function useTransactions(
  type: string,
  network?: INetwork,
  account?: IChainAccount,
  count?: number
) {
  const { value, retry, loading } = useAsyncRetry(async () => {
    if (network === undefined || account === undefined) {
      return
    }
    try {
      return await getTransactionService(account.networkKind).fetchTransactions(
        account,
        type
      )
    } catch (e) {
      console.error(e)
    }
  }, [type, network, account])

  useEffect(() => {
    if (!loading && typeof value === 'number' && value > 0) {
      retry()
    }
  }, [value, retry, loading])

  return useLiveQuery(async () => {
    if (account === undefined || count === undefined) {
      return
    }
    let txs = await getTransactionService(account.networkKind).getTransactions(
      account,
      type,
      count
    )
    if (account.networkKind === NetworkKind.EVM) {
      txs = formatEvmTransactions(txs)
    }
    return txs
  }, [type, account, count])
}

export function useTransactionsMixed(
  type: string,
  network?: INetwork,
  account?: IChainAccount,
  count?: number
) {
  const pendingTxTotal = usePendingTxCount(account)
  const historyTxTotal = useTransactionCount(type, account)

  const [pendingTxCount, historyTxCount] = useMemo(() => {
    let pendingTxCount, historyTxCount

    if (typeof count === 'number') {
      if (typeof pendingTxTotal === 'number' && pendingTxTotal > 0) {
        pendingTxCount = Math.min(pendingTxTotal, count)
      }

      if (
        typeof historyTxTotal === 'number' &&
        historyTxTotal > 0 &&
        (pendingTxCount || 0) < count
      ) {
        historyTxCount = Math.min(historyTxTotal, count - (pendingTxCount || 0))
      }
    }

    return [pendingTxCount, historyTxCount]
  }, [count, pendingTxTotal, historyTxTotal])

  const pendingTxs = usePendingTxs(network, account, pendingTxCount)

  const historyTxs = useTransactions(type, network, account, historyTxCount)

  const txs = useMemo(() => {
    if (!pendingTxs && !historyTxs) {
      return
    }
    return [...(pendingTxs || []), ...(historyTxs || [])]
  }, [pendingTxs, historyTxs])

  return {
    txTotal:
      pendingTxTotal !== undefined && historyTxTotal !== undefined
        ? pendingTxTotal + historyTxTotal
        : undefined,
    pendingTxCount,
    historyTxCount,
    txs
  }
}
