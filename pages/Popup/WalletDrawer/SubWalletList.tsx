import { Box } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useRef } from 'react'

import { DeleteWalletOpts } from '~components/DeleteWalletModal'
import { WalletId } from '~lib/active'
import { usePaginatedBalances } from '~lib/hooks/usePaginatedBalances'
import { useInitialWalletTreeState } from '~lib/hooks/useWalletTreeState'
import { INetwork, IWallet } from '~lib/schema'
import { SubWalletEntry } from '~lib/services/wallet/tree'

import { SubWalletItem } from './SubWalletItem'

interface SubWalletListProps {
  network: INetwork
  wallet: IWallet
  subWallets: SubWalletEntry[]
  onSelectedId: (selected: WalletId) => void
  onDelete: (opts: DeleteWalletOpts) => void
  measure: () => void
  reorderSubWallets: (
    network: SubWalletEntry,
    placement: 'top' | 'up' | 'down' | 'bottom'
  ) => void
  setSubScrollOffset: (walletId: number, offset: number) => void
}

export const SubWalletList = ({
  network,
  wallet,
  subWallets,
  onSelectedId,
  onDelete,
  measure,
  reorderSubWallets,
  setSubScrollOffset
}: SubWalletListProps) => {
  useEffect(measure, [measure, subWallets])

  const initialState = useInitialWalletTreeState(true)

  const parentRef = useRef(null)
  const walletsVirtualizer = useVirtualizer({
    count: subWallets.length || 0,
    initialOffset: initialState.subOffsets[wallet.id] || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    getItemKey: (index) => subWallets[index].subWallet.id
  })

  useEffect(() => {
    setSubScrollOffset(wallet.id, walletsVirtualizer.scrollOffset)
  }, [walletsVirtualizer.scrollOffset, setSubScrollOffset, wallet.id])

  const virtualItems = walletsVirtualizer.getVirtualItems()

  const balanceMap = usePaginatedBalances(
    network,
    subWallets,
    virtualItems[0]?.index,
    virtualItems[0]?.index + virtualItems.length
  )

  if (!subWallets.length) {
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
            const {
              subWallet: { masterId, id },
              account
            } = subWallet

            return (
              <Box
                key={id}
                ref={walletsVirtualizer.measureElement}
                data-index={item.index}
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
                    balance={balanceMap.get(account.id)}
                    onSelected={() =>
                      onSelectedId({
                        id: masterId,
                        subId: id
                      })
                    }
                    onDelete={onDelete}
                    reorderSubWallets={reorderSubWallets}
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
