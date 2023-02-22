import { Box } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

import { INetwork, IWallet } from '~lib/schema'

import { WalletItem } from './WalletItem'

export const WalletList = ({
  wallets,
  selected,
  onSelected,
  renderItems = 6
}: {
  wallets: IWallet[]
  selected?: IWallet
  onSelected: (wallet: IWallet) => void
  renderItems?: number
}) => {
  const itemSize = 56
  const selfItemSize = itemSize + 2 + 7

  const parentRef = useRef(null)
  const walletsVirtualizer = useVirtualizer({
    count: wallets.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      return selfItemSize
    },
    getItemKey: (index) => wallets[index].id
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
              key={wallet.id}
              position="absolute"
              top={0}
              left={0}
              transform={`translateY(${item.start}px)`}
              w="full"
              minH={selfItemSize + 'px'}>
              <WalletItem
                wallet={wallet}
                isSelected={selected?.id === wallet.id}
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