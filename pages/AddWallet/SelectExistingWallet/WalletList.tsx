import { Box } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

import { ExistingGroupWallet } from '~lib/services/wallet'

import { WalletItem } from './WalletItem'

export const WalletList = ({
  wallets,
  selected,
  onSelected,
  renderItems = 6
}: {
  wallets: ExistingGroupWallet[]
  selected?: ExistingGroupWallet
  onSelected: (wallet: ExistingGroupWallet) => void
  renderItems?: number
}) => {
  const itemSize = 56
  const selfItemSize = itemSize + 2 + 7

  const parentRef = useRef(null)
  const walletsVirtualizer = useVirtualizer({
    count: wallets.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => {
      return selfItemSize
    },
    getItemKey: (index) => wallets[index].wallet.id
  })

  return (
    <Box
      ref={parentRef}
      maxH={renderItems * selfItemSize + 'px'}
      overflowY="auto"
      userSelect="none">
      <Box h={walletsVirtualizer.getTotalSize() + 'px'} position="relative">
        {walletsVirtualizer.getVirtualItems().map((item) => {
          const wallet = wallets[item.index]
          return (
            <Box
              key={wallet.wallet.id}
              position="absolute"
              top={0}
              left={0}
              transform={`translateY(${item.start}px)`}
              w="full"
              minH={selfItemSize + 'px'}>
              <WalletItem
                wallet={wallet}
                isSelected={selected?.wallet.id === wallet.wallet.id}
                onSelected={() => onSelected(wallet)}
                measureElement={(el: unknown) => {
                  item.measureElement(el)
                  ;(walletsVirtualizer as any).calculateRange()
                }}
              />
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
