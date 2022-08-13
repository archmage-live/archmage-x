import { Box } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useMemo, useRef } from 'react'
import { useDebounce } from 'react-use'

import { INetwork } from '~lib/schema/network'
import { IWalletInfo } from '~lib/schema/walletInfo'
import { useSubWallets, useSubWalletsInfo } from '~lib/services/walletService'

import { SubWalletItem } from './SubWalletItem'

interface SubWalletListProps {
  network: INetwork
  masterId: number
  selectedId?: number

  onSelectedId(selectedId: number): void

  measure(): void
}

export const SubWalletList = ({
  network,
  masterId,
  selectedId,
  onSelectedId,
  measure
}: SubWalletListProps) => {
  const wallets = useSubWallets(masterId)

  useDebounce(measure, 50, [measure, wallets])

  const infos = useSubWalletsInfo(masterId, network.kind, network.chainId)
  const infoMap = useMemo(() => {
    const m = new Map<string, IWalletInfo>()
    infos?.forEach((info) => m.set(`${info.masterId}-${info.index}`, info))
    return m
  }, [infos])

  const parentRef = useRef(null)
  const walletsVirtualizer = useVirtualizer({
    count: wallets?.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    getItemKey: (index) => wallets?.[index].id!
  })

  if (!wallets?.length) {
    return <></>
  }

  return (
    <Box py={2} px={8}>
      <Box
        ref={parentRef}
        maxH="540px"
        overflowY="auto"
        borderRadius="xl"
        p="14px">
        <Box h={walletsVirtualizer.getTotalSize()} position="relative">
          {walletsVirtualizer.getVirtualItems().map((item) => {
            const wallet = wallets[item.index]
            const info = infoMap.get(`${wallet.masterId}-${wallet.index}`)
            return (
              <Box
                key={wallet.id}
                ref={item.measureElement}
                position="absolute"
                top={0}
                left={0}
                transform={`translateY(${item.start}px)`}
                w="full"
                h="64px">
                <SubWalletItem
                  wallet={wallet}
                  info={info}
                  selected={wallet.id === selectedId}
                  onSelected={() => onSelectedId(wallet.id!)}
                />
              </Box>
            )
          })}
        </Box>
      </Box>
    </Box>
  )
}
