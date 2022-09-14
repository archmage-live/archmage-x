import { Box } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

import { WalletId } from '~lib/active'
import { INetwork, PSEUDO_INDEX } from '~lib/schema'
import { WALLET_SERVICE } from '~lib/services/walletService'
import { isWalletGroup } from '~lib/wallet'
import { WalletEntry } from '~pages/Popup/WalletDrawer/tree'

import { WalletItem } from './WalletItem'

interface WalletListProps {
  network?: INetwork
  wallets: WalletEntry[]
  onToggleOpen: (id: number) => void
  onSelected?: (selected: WalletId) => void
  activeId?: WalletId
  onClose?: () => void
  onChecked?: (item: WalletId | number, isChecked: boolean) => void
  renderItems?: number
  px?: number | string
  py?: number | string
}

export const WalletList = ({
  network,
  wallets,
  onToggleOpen,
  onSelected,
  activeId,
  onClose,
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
      if (!wallet.isOpen || !wallet.subWallets.length) {
        return itemSize
      } else {
        return itemSize * wallet.subWallets.length + itemSize + 16
      }
    },
    getItemKey: (index) => wallets[index].wallet.id,
    overscan: Math.max(Math.min(wallets.length || 0, 50) - renderItems, 1)
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
                  onSelected={onSelected}
                  activeId={activeId}
                  onClose={onClose}
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
