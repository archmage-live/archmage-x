import { Box } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useRef, useState } from 'react'

import { INetwork, IWallet } from '~lib/schema'
import { WALLET_SERVICE, useWallets } from '~lib/services/walletService'

import { ActiveId } from '../select'
import { WalletItem } from './WalletItem'

interface WalletListProps {
  network?: INetwork
  selectedId?: number
  onSelectedId: (selectedId: number) => void
  selectedSubId?: number
  onSelectedSubId: (selectedSubId: number) => void
  activeId?: ActiveId
  onClose: () => void
}

export const WalletList = ({
  network,
  selectedId,
  onSelectedId,
  selectedSubId,
  onSelectedSubId,
  activeId,
  onClose
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

  return (
    <Box py="14px">
      <Box
        ref={parentRef}
        maxH="336px"
        overflowY="auto"
        borderRadius="xl"
        userSelect="none">
        <Box h={walletsVirtualizer.getTotalSize()} position="relative">
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
                  onSelected={() => onSelectedId(wallet.id!)}
                  selectedSubId={selectedSubId}
                  onSelectedSubId={onSelectedSubId}
                  activeId={activeId}
                  onClose={onClose}
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