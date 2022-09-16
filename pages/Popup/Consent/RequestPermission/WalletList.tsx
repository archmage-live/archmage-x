import { Box } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

import { WalletId } from '~lib/active'
import { INetwork } from '~lib/schema'
import { isWalletGroup } from '~lib/wallet'
import { WalletEntry } from '~pages/Popup/WalletDrawer/tree'

import { WalletItem } from './WalletItem'

interface WalletListProps {
  network?: INetwork
  wallets: WalletEntry[]
  onToggleOpen: (id: number) => void
  onChecked: (item: WalletId | number, isChecked: boolean) => void
  renderItems?: number
  px?: number | string
  py?: number | string
}

export const WalletList = ({
  network,
  wallets,
  onToggleOpen,
  onChecked,
  renderItems = 6,
  px,
  py = '14px'
}: WalletListProps) => {
  const itemSize = 56

  const parentRef = useRef(null)
  const walletsVirtualizer = useVirtualizer({
    count: wallets.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const wallet = wallets[index]
      if (!wallet.isOpen || !isWalletGroup(wallet.wallet.type)) {
        return itemSize
      } else {
        return (
          itemSize + (itemSize * Math.min(wallet.subWallets.length, 6) + 2 + 14)
        )
      }
    },
    getItemKey: (index) => wallets[index].wallet.id
  })

  return (
    <Box py={py}>
      <Box
        ref={parentRef}
        maxH={renderItems * itemSize + 'px'}
        px={px}
        overflowY="auto"
        borderRadius="xl"
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
                minH={itemSize + 'px'}>
                <WalletItem
                  network={network}
                  walletEntry={walletEntry}
                  onToggleOpen={onToggleOpen}
                  onChecked={onChecked}
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
    </Box>
  )
}
