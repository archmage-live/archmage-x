import { Box } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useRef } from 'react'

import { ActiveWalletId } from '~lib/active'
import { INetwork, IWallet, PSEUDO_INDEX } from '~lib/schema'
import { WALLET_SERVICE } from '~lib/services/walletService'
import { WalletType } from '~lib/wallet'

import { WalletItem } from './WalletItem'

interface WalletListProps {
  network?: INetwork
  wallets: IWallet[]
  selectedId?: number
  onSelectedId?: (selectedId: number) => void
  selectedSubId?: number
  onSelectedSubId?: (selectedSubId: number) => void
  activeId?: ActiveWalletId
  onClose?: () => void
  checked?: Map<number, number[]>
  onChecked?: (ids: Map<number, number[]>) => void
  renderItems?: number
  px?: number | string
  py?: number | string
}

export const WalletList = ({
  network,
  wallets,
  selectedId,
  onSelectedId,
  selectedSubId,
  onSelectedSubId,
  activeId,
  onClose,
  checked,
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
    estimateSize: () => itemSize,
    getItemKey: (index) => wallets[index].id,
    overscan: Math.max(Math.min(wallets.length || 0, 50) * 7 - renderItems, 0)
  })

  useEffect(() => {
    if (!onChecked) {
      return
    }
    if (
      checked?.size === wallets.length &&
      wallets.every((w) => checked.has(w.id))
    ) {
      return
    }
    onChecked?.(new Map(wallets.map((w) => [w.id, [] as number[]])))
  }, [checked, onChecked, wallets])

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
            const wallet = wallets[item.index]!

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
                  wallet={wallet}
                  selected={wallet.id === selectedId}
                  onSelected={async () => {
                    onSelectedId?.(wallet.id)
                    if (wallet.type !== WalletType.HD) {
                      const subWallet = await WALLET_SERVICE.getSubWallet({
                        masterId: wallet.id,
                        index: PSEUDO_INDEX
                      })
                      onSelectedSubId?.(subWallet?.id!)
                    }
                  }}
                  selectedSubId={selectedSubId}
                  onSelectedSubId={onSelectedSubId}
                  activeId={activeId}
                  onClose={onClose}
                  checked={checked?.get(wallet.id)}
                  onChecked={
                    onChecked
                      ? (ids) => {
                          const map = new Map(checked)
                          map.set(wallet.id, ids)
                          console.log(map)
                          onChecked(map)
                        }
                      : undefined
                  }
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
