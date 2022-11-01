import { Box } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

import { WalletId } from '~lib/active'
import { INetwork } from '~lib/schema'
import { WalletEntry } from '~lib/services/wallet/tree'
import { isWalletGroup } from '~lib/wallet'
import { usePaginatedBalances } from '~pages/Popup/WalletDrawer/SubWalletList'

import { WalletItem } from './WalletItem'

interface WalletListProps {
  network?: INetwork
  wallets: WalletEntry[]
  onToggleOpen: (id: number) => void
  onSelected: (selected: WalletId) => void
  onClose: () => void
  renderItems?: number
  px?: number | string
  py?: number | string
  reorderWallets: (
    network: WalletEntry,
    placement: 'top' | 'up' | 'down' | 'bottom'
  ) => void
}

export const WalletList = ({
  network,
  wallets,
  onToggleOpen,
  onSelected,
  onClose,
  renderItems = 6,
  px,
  py = '14px',
  reorderWallets
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

  const virtualItems = walletsVirtualizer.getVirtualItems()

  const balanceMap = usePaginatedBalances(
    network,
    wallets,
    virtualItems[0]?.index,
    virtualItems[0]?.index + virtualItems.length
  )

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
            const { wallet, subWallets } = walletEntry

            const subWallet = !isWalletGroup(wallet.type)
              ? subWallets[0]
              : undefined

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
                  balance={subWallet && balanceMap.get(subWallet.account.id)}
                  onToggleOpen={onToggleOpen}
                  onSelected={onSelected}
                  onClose={onClose}
                  measureElement={(el: unknown) => {
                    item.measureElement(el)
                    ;(walletsVirtualizer as any).calculateRange()
                  }}
                  reorderWallets={reorderWallets}
                />
              </Box>
            )
          })}
        </Box>
      </Box>
    </Box>
  )
}
