import { Box } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

import { useActiveNetwork } from '~lib/active'
import { getNetworkInfo, useNetworks } from '~lib/services/network'
import { NetworkItem } from '~pages/Popup/NetworkDrawer/NetworkItem'

export const NetworkList = ({ onSelected }: { onSelected(): void }) => {
  const networks = useNetworks() || []

  const { networkId, setNetworkId } = useActiveNetwork()

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
                  selected={networkId === net.id}
                  onSelected={() => {
                    setNetworkId(net.id!).finally(onSelected)
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
