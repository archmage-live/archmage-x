import { Box } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useRef, useState } from 'react'
import { useDebounce } from 'react-use'

import { WalletId } from '~lib/active'
import { INetwork, ISubWallet } from '~lib/schema'
import { IChainAccount } from '~lib/schema/chainAccount'
import { SubWalletEntry } from '~pages/Popup/WalletDrawer/tree'

import { SubWalletItem } from './SubWalletItem'

interface SubWalletListProps {
  network: INetwork
  subWallets?: SubWalletEntry[]
  scrollIndex?: number
  setScrollIndex?: (scrollIndex?: number) => void
  onSelectedId: (selected: WalletId) => void
  activeId?: WalletId
  onChecked?: (item: WalletId, isChecked: boolean) => void
  onClose?: () => void
  measure: () => void
}

export const SubWalletList = ({
  network,
  subWallets,
  scrollIndex,
  setScrollIndex,
  onSelectedId,
  activeId,
  onChecked,
  onClose,
  measure
}: SubWalletListProps) => {
  useEffect(measure, [measure, subWallets])

  const parentRef = useRef(null)
  const walletsVirtualizer = useVirtualizer({
    count: subWallets?.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    getItemKey: (index) => subWallets![index].subWallet.id
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

  if (!subWallets?.length) {
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
            const { subWallet: wallet, account } = subWallet

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
                    subWallet={subWallet}
                    onSelected={() =>
                      onSelectedId({
                        id: wallet.masterId,
                        subId: wallet.id
                      })
                    }
                    active={activeId?.subId === wallet.id}
                    onChecked={
                      onChecked !== undefined
                        ? (isChecked) => {
                            onChecked(
                              {
                                id: wallet.masterId,
                                subId: wallet.id
                              },
                              isChecked
                            )
                          }
                        : undefined
                    }
                    onClose={onClose}
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
