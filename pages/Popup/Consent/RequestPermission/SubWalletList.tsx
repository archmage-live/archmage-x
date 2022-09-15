import { Box } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useRef } from 'react'

import { WalletId } from '~lib/active'
import { INetwork } from '~lib/schema'
import { SubWalletEntry } from '~pages/Popup/WalletDrawer/tree'

import { SubWalletItem } from './SubWalletItem'

interface SubWalletListProps {
  network: INetwork
  subWallets: SubWalletEntry[]
  onChecked: (item: WalletId, isChecked: boolean) => void
  measure: () => void
}

export const SubWalletList = ({
  network,
  subWallets,
  onChecked,
  measure
}: SubWalletListProps) => {
  useEffect(measure, [measure, subWallets])

  const parentRef = useRef(null)
  const walletsVirtualizer = useVirtualizer({
    count: subWallets.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    getItemKey: (index) => subWallets[index].subWallet.id
  })

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
            const { subWallet: wallet } = subWallet

            return (
              <Box
                key={wallet.id}
                ref={item.measureElement}
                position="absolute"
                top={0}
                left={0}
                transform={`translateY(${item.start}px)`}
                w="full"
                h="56px">
                <SubWalletItem
                  network={network}
                  subWallet={subWallet}
                  onChecked={(isChecked) => {
                    onChecked(
                      {
                        id: wallet.masterId,
                        subId: wallet.id
                      },
                      isChecked
                    )
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
