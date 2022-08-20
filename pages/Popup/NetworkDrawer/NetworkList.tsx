import { Box } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

import { getNetworkInfo, useNetworks } from '~lib/services/network'
import { NetworkItem } from '~pages/Popup/NetworkDrawer/NetworkItem'
import { useSelectedNetwork } from '~pages/Popup/select'

export const NetworkList = ({ onSelected }: { onSelected(): void }) => {
  const networks = useNetworks() || []

  const { selectedNetworkId, setSelectedNetworkId } = useSelectedNetwork()

  const parentRef = useRef(null)
  const networksVirtualizer = useVirtualizer({
    count: networks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    getItemKey: (index) => networks[index].id!
  })

  return (
    <Box py="14px">
      <Box
        ref={parentRef}
        maxH="336px"
        overflowY="auto"
        borderRadius="xl"
        userSelect="none">
        <Box h={networksVirtualizer.getTotalSize() + 'px'} position="relative">
          {networksVirtualizer.getVirtualItems().map((item) => {
            const net = networks[item.index]
            const info = getNetworkInfo(net)

            return (
              <Box
                key={net.id}
                position="absolute"
                top={0}
                left={0}
                transform={`translateY(${item.start}px)`}
                w="full"
                minH="56px">
                <NetworkItem
                  network={net}
                  info={info}
                  selected={selectedNetworkId === net.id}
                  onSelected={() => {
                    setSelectedNetworkId(net.id!).finally(onSelected)
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
