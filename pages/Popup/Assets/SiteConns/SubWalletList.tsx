import { Box } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useRef, useState } from 'react'
import { useDebounce } from 'react-use'

import { WalletId } from '~lib/active'
import { INetwork, ISubWallet } from '~lib/schema'
import { IChainAccount } from '~lib/schema/chainAccount'

import { SubWalletItem } from './SubWalletItem'

interface SubWalletListProps {
  network: INetwork
  wallets: ISubWallet[]
  accounts: (IChainAccount | undefined)[]
  scrollIndex?: number
  setScrollIndex?: (scrollIndex?: number) => void
  selectedId?: number
  onSelectedId: (selectedId: number) => void
  activeId?: WalletId
  checked?: number[]
  onChecked?: (ids: number[]) => void
  measure: () => void
}

export const SubWalletList = ({
  network,
  wallets,
  accounts,
  scrollIndex,
  setScrollIndex,
  selectedId,
  onSelectedId,
  activeId,
  checked,
  onChecked,
  measure
}: SubWalletListProps) => {
  useEffect(measure, [measure, wallets])

  const parentRef = useRef(null)
  const walletsVirtualizer = useVirtualizer({
    count: wallets?.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    getItemKey: (index) => wallets?.[index].id!
  })

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

  const [checkedSet, setCheckedSet] = useState<Set<number>>(new Set())
  useEffect(() => {
    setCheckedSet(new Set(checked || []))
  }, [checked])

  if (!wallets?.length) {
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
            const wallet: ISubWallet = wallets[item.index]
            const account = accounts[item.index]

            return (
              <Box
                key={wallet.id}
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
                    wallet={wallet}
                    account={account}
                    selected={wallet.id === selectedId}
                    onSelected={() => onSelectedId(wallet.id!)}
                    active={activeId?.subId === wallet.id}
                    isChecked={!!account.id && checkedSet.has(account.id)}
                    onChecked={
                      onChecked !== undefined
                        ? (isChecked) => {
                            const id = account.id!
                            let set
                            if (isChecked && !checkedSet.has(id)) {
                              set = new Set(checkedSet).add(id)
                            } else if (!isChecked && checkedSet.has(id)) {
                              set = new Set(checkedSet)
                              set.delete(id)
                            } else {
                              return
                            }

                            setCheckedSet(set)
                            onChecked(Array.from(set.values()))
                          }
                        : undefined
                    }
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
