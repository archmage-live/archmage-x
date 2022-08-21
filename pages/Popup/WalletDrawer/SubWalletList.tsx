import { Box } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useRef, useState } from 'react'

import { ActiveWalletId } from '~lib/active'
import { IDerivedWallet } from '~lib/schema'
import { IChainAccount } from '~lib/schema/chainAccount'

import { SubWalletItem } from './SubWalletItem'

interface SubWalletListProps {
  wallets: IDerivedWallet[]
  accounts: (IChainAccount | undefined)[]
  selectedId?: number
  onSelectedId: (selectedId: number) => void
  activeId?: ActiveWalletId
  checked?: number[]
  onChecked?: (ids: number[]) => void
  measure: () => void
}

export const SubWalletList = ({
  wallets,
  accounts,
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

  const [checkedSet, setCheckedSet] = useState<Set<number>>(new Set())
  useEffect(() => {
    setCheckedSet(new Set(checked || []))
  }, [checked])

  if (!wallets?.length) {
    return <></>
  }

  return (
    <Box py={2} px={4}>
      <Box ref={parentRef} maxH="336px" overflowY="auto" borderRadius="xl">
        <Box h={walletsVirtualizer.getTotalSize() + 'px'} position="relative">
          {walletsVirtualizer.getVirtualItems().map((item) => {
            const wallet: IDerivedWallet = wallets[item.index]
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
                <SubWalletItem
                  wallet={wallet}
                  account={account}
                  selected={wallet.id === selectedId}
                  onSelected={() => onSelectedId(wallet.id!)}
                  active={activeId?.derivedId === wallet.id}
                  isChecked={!!account?.id && checkedSet.has(account.id)}
                  onChecked={
                    onChecked !== undefined
                      ? (isChecked) => {
                          const id = account?.id
                          if (id === undefined) {
                            return
                          }
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
              </Box>
            )
          })}
        </Box>
      </Box>
    </Box>
  )
}
