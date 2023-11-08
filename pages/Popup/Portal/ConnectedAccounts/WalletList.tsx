import { Box } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

import { INetwork } from '~lib/schema'
import { isWalletGroup } from '~lib/wallet'

import { Entry } from '.'
import { WalletItem } from './WalletItem'

interface WalletListProps {
  network?: INetwork
  wallets: Entry[]
  onToggleOpen: (id: number) => void
  renderItems?: number
}

export const WalletList = ({
  network,
  wallets,
  onToggleOpen,
  renderItems = 6
}: WalletListProps) => {
  const itemSize = 56
  const selfItemSize = itemSize + 2 + 7

  const parentRef = useRef(null)
  const walletsVirtualizer = useVirtualizer({
    count: wallets.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const wallet = wallets[index]
      if (!wallet.isOpen || !isWalletGroup(wallet.wallet)) {
        return selfItemSize
      } else {
        return (
          selfItemSize +
          (itemSize * Math.min(wallet.subWallets.length, 6) + 2 + 14)
        )
      }
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
          const walletEntry = wallets[item.index]!
          const { wallet } = walletEntry

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
                network={network}
                walletEntry={walletEntry}
                onToggleOpen={onToggleOpen}
                measureElement={(el: HTMLElement | null) => {
                  walletsVirtualizer.measureElement(el)
                  walletsVirtualizer.calculateRange()
                }}
                index={item.index}
              />
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
