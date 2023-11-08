import { useEffect, useMemo, useState } from 'react'

import { INetwork } from '~lib/schema'
import { useBalances } from '~lib/services/provider'
import { Amount } from '~lib/services/token'
import { SubWalletEntry, WalletEntry } from '~lib/services/wallet/tree'
import { isWalletGroup } from '~lib/wallet'

export function usePaginatedBalances(
  network?: INetwork,
  wallets?: WalletEntry[] | SubWalletEntry[],
  startIndex: number = 0,
  endIndex: number = 0
) {
  const [balanceMap, setBalanceMap] = useState(new Map<number, Amount>())

  useEffect(() => {
    setBalanceMap(new Map())
  }, [network])

  const pageSize = 100
  const startPage = Math.floor(startIndex / pageSize)
  const endPage = Math.floor((endIndex - 1) / pageSize) + 1
  const start = startPage * pageSize
  const end = endPage * pageSize
  // console.log('start, end:', start, end)

  const accounts = useMemo(() => {
    if (isWalletEntries(wallets)) {
      return wallets
        .slice(start, end)
        .filter(({ wallet }) => !isWalletGroup(wallet))
        .map(({ subWallets }) => subWallets[0].account)
    } else {
      return wallets?.slice(start, end).map((subWallet) => subWallet.account)
    }
  }, [wallets, start, end])

  const balances = useBalances(network, accounts)

  useEffect(() => {
    if (!balances || !accounts) {
      return
    }

    setBalanceMap((oldBalances) => {
      const balanceMap = new Map(oldBalances.entries())
      let changed = false
      for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i]
        const balance = balances.get(account.id)
        const existing = balanceMap.get(account.id)

        if (!existing && !balance) {
          continue
        }
        if (
          existing &&
          balance &&
          existing.symbol === balance.symbol &&
          existing.amount === balance.amount &&
          existing.amountParticle === balance.amountParticle
        ) {
          continue
        }

        if (balance) {
          balanceMap.set(account.id, balance)
        } else {
          balanceMap.delete(account.id)
        }
        changed = true
      }
      return changed ? balanceMap : oldBalances
    })
  }, [accounts, balances])

  return balanceMap
}

function isWalletEntries(
  wallets: WalletEntry[] | SubWalletEntry[] | undefined
): wallets is WalletEntry[] {
  return !!(wallets?.length && (wallets[0] as WalletEntry).wallet)
}
