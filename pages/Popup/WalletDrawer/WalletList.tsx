import { Box } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useRef, useState } from 'react'

import { INetwork, IWallet } from '~lib/schema'
import { WALLET_SERVICE, useWallets } from '~lib/services/walletService'

import { WalletItem } from './WalletItem'

interface WalletListProps {
  network?: INetwork
  selectedId?: number
  onSelectedId: (selectedId: number) => void
  selectedSubId?: number
  onSelectedSubId: (selectedSubId: number) => void
}

export const WalletList = ({
  network,
  selectedId,
  onSelectedId,
  selectedSubId,
  onSelectedSubId
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
    estimateSize: () => 64,
    getItemKey: (index) => wallets[index].id!
  })

  return (
    <Box
      ref={parentRef}
      maxH="540px"
      overflowY="auto"
      borderRadius="xl"
      p="14px"
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
              minH="64px">
              <WalletItem
                network={network}
                wallet={wallet}
                selected={wallet.id === selectedId}
                onSelected={() => onSelectedId(wallet.id!)}
                selectedSubId={selectedSubId}
                onSelectedSubId={onSelectedSubId}
                measureElement={item.measureElement}
              />
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
