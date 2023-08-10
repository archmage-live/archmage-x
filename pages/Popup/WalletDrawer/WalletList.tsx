import { Box } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useRef } from 'react'

import { WalletId } from '~lib/active'
import { INetwork } from '~lib/schema'
import { WalletEntry } from '~lib/services/wallet/tree'
import { isWalletGroup } from '~lib/wallet'
import { usePaginatedBalances } from '~pages/Popup/WalletDrawer/SubWalletList'

import { WalletItem } from './WalletItem'
import { useInitialWalletTreeState } from './useWalletTreeState'

interface WalletListProps {
  network?: INetwork
  wallets: WalletEntry[]
  openState: Record<number, boolean>
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
  setScrollOffset: (offset: number) => void
  setSubScrollOffset: (walletId: number, offset: number) => void
}

export const WalletList = ({
  network,
  wallets,
  openState,
  onToggleOpen,
  onSelected,
  onClose,
  renderItems = 6,
  px,
  py = '14px',
  reorderWallets,
  setScrollOffset,
  setSubScrollOffset
}: WalletListProps) => {
  const itemSize = 56

  const initialState = useInitialWalletTreeState()

  const parentRef = useRef(null)
  const walletsVirtualizer = useVirtualizer({
    count: wallets.length || 0,
    initialOffset: initialState.offset,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const wallet = wallets[index]
      if (!openState[wallet.wallet.id] || !isWalletGroup(wallet.wallet.type)) {
        return itemSize
      } else {
        return (
          itemSize + (itemSize * Math.min(wallet.subWallets.length, 6) + 2 + 14)
        )
      }
    },
    getItemKey: (index) => wallets[index].wallet.id
  })

  useEffect(() => {
    setScrollOffset(walletsVirtualizer.scrollOffset)
  }, [walletsVirtualizer.scrollOffset, setScrollOffset])

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
                  isOpen={openState[wallet.id]}
                  onToggleOpen={onToggleOpen}
                  onSelected={onSelected}
                  onClose={onClose}
                  measureElement={(el: HTMLElement | null) => {
                    walletsVirtualizer.measureElement(el)
                    walletsVirtualizer.calculateRange()
                  }}
                  index={item.index}
                  reorderWallets={reorderWallets}
                  setSubScrollOffset={setSubScrollOffset}
                />
              </Box>
            )
          })}
        </Box>
      </Box>
    </Box>
  )
}
