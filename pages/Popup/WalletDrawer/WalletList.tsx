import { Box } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useRef, useState } from 'react'

import { ActiveWalletId } from '~lib/active'
import { INetwork, IWallet } from '~lib/schema'
import { WALLET_SERVICE, useWallets } from '~lib/services/walletService'

import { WalletItem } from './WalletItem'

interface WalletListProps {
  network?: INetwork
  selectedId?: number
  onSelectedId?: (selectedId: number) => void
  selectedSubId?: number
  onSelectedSubId?: (selectedSubId: number) => void
  activeId?: ActiveWalletId
  onClose?: () => void
  onChecked?: (ids: { masterId: number; index?: number }[]) => void
  maxH?: number | string
}

export const WalletList = ({
  network,
  selectedId,
  onSelectedId,
  selectedSubId,
  onSelectedSubId,
  activeId,
  onClose,
  onChecked,
  maxH
}: WalletListProps) => {
  const ws = useWallets()
  useEffect(() => {
    const effect = async () => {
      if (!network) {
        return
      }
      if (ws) {
        for (const w of ws) {
          await WALLET_SERVICE.ensureSubWalletsInfo(
            w,
            network.kind,
            network.chainId
          )
        }
      }
    }
    effect()
  }, [network, ws])

  const [wallets, setWallets] = useState<IWallet[]>([])
  useEffect(() => {
    if (ws) setWallets(ws)
  }, [ws])

  const parentRef = useRef(null)
  const walletsVirtualizer = useVirtualizer({
    count: wallets.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    getItemKey: (index) => wallets[index].id!
  })

  const [checked, setChecked] = useState<
    { masterId: number; index?: number }[][]
  >([])
  useEffect(() => {
    setChecked(new Array(wallets.length).fill([]))
  }, [wallets])

  return (
    <Box py="14px">
      <Box
        ref={parentRef}
        maxH={maxH || '336px'}
        overflowY="auto"
        borderRadius="xl"
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
                minH="56px">
                <WalletItem
                  network={network}
                  wallet={wallet}
                  selected={wallet.id === selectedId}
                  onSelected={() => onSelectedId?.(wallet.id!)}
                  selectedSubId={selectedSubId}
                  onSelectedSubId={onSelectedSubId}
                  activeId={activeId}
                  onClose={onClose}
                  checked={checked[item.index]}
                  onChecked={
                    onChecked
                      ? (ids) => {
                          const checkedArray = checked.slice()
                          checkedArray[item.index] = ids
                          setChecked(checkedArray)
                          onChecked(checkedArray.flat())
                        }
                      : undefined
                  }
                  measureElement={item.measureElement}
                />
              </Box>
            )
          })}
        </Box>
      </Box>
    </Box>
  )
}
