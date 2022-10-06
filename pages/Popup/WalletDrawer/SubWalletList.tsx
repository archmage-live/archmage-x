import { Box } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDebounce } from 'react-use'

import { WalletId } from '~lib/active'
import { INetwork } from '~lib/schema'
import { useBalances } from '~lib/services/provider'
import { Balance } from '~lib/services/token'
import { isWalletGroup } from '~lib/wallet'
import { SubWalletEntry, WalletEntry } from '~pages/Popup/WalletDrawer/tree'
import { DeleteWalletOpts } from '~pages/Settings/SettingsWallets/DeleteWalletModal'

import { SubWalletItem } from './SubWalletItem'

interface SubWalletListProps {
  network: INetwork
  subWallets: SubWalletEntry[]
  scrollIndex?: number
  setScrollIndex?: (scrollIndex?: number) => void
  onSelectedId: (selected: WalletId) => void
  onDelete: (opts: DeleteWalletOpts) => void
  measure: () => void
}

export const SubWalletList = ({
  network,
  subWallets,
  scrollIndex,
  setScrollIndex,
  onSelectedId,
  onDelete,
  measure
}: SubWalletListProps) => {
  useEffect(measure, [measure, subWallets])

  const parentRef = useRef(null)
  const walletsVirtualizer = useVirtualizer({
    count: subWallets.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    getItemKey: (index) => subWallets[index].subWallet.id
  })

  const virtualItems = walletsVirtualizer.getVirtualItems()

  const balanceMap = usePaginatedBalances(
    network,
    subWallets,
    virtualItems[0]?.index,
    virtualItems[0]?.index + virtualItems.length
  )

  useDebounce(
    () => {
      if (scrollIndex !== undefined) {
        walletsVirtualizer.scrollToIndex(scrollIndex)
        setScrollIndex?.(undefined)
      }
    },
    500,
    [scrollIndex, setScrollIndex]
  )

  if (!subWallets.length) {
    return <></>
  }

  return (
    <Box py={2} px={4}>
      <Box
        ref={parentRef}
        maxH="338px"
        overflowY="auto"
        borderRadius="xl"
        borderWidth="1px">
        <Box h={walletsVirtualizer.getTotalSize() + 'px'} position="relative">
          {walletsVirtualizer.getVirtualItems().map((item) => {
            const subWallet = subWallets[item.index]
            const {
              subWallet: { masterId, id },
              account
            } = subWallet

            return (
              <Box
                key={id}
                ref={item.measureElement}
                position="absolute"
                top={0}
                left={0}
                transform={`translateY(${item.start}px)`}
                w="full"
                h="56px">
                {account && (
                  <SubWalletItem
                    network={network}
                    subWallet={subWallet}
                    balance={balanceMap.get(account.id)}
                    onSelected={() =>
                      onSelectedId({
                        id: masterId,
                        subId: id
                      })
                    }
                    onDelete={onDelete}
                  />
                )}
              </Box>
            )
          })}
        </Box>
      </Box>
    </Box>
  )
}

export function usePaginatedBalances(
  network?: INetwork,
  wallets?: WalletEntry[] | SubWalletEntry[],
  startIndex: number = 0,
  endIndex: number = 0
) {
  const [balanceMap, setBalanceMap] = useState(new Map<number, Balance>())

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
        .filter(({ wallet }) => !isWalletGroup(wallet.type))
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
