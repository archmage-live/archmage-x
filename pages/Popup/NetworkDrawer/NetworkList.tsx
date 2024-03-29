import { Box } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useRef } from 'react'

import { useActiveNetworkId } from '~lib/active'
import { useInitialNetworkTreeState } from '~lib/hooks/useNetworkTreeState'
import { INetwork } from '~lib/schema'
import { getNetworkInfo } from '~lib/services/network'

import { NetworkItem } from './NetworkItem'

export const NetworkList = ({
  networks,
  networkLogos,
  onSelected,
  reorder,
  setScrollOffset
}: {
  networks: INetwork[]
  networkLogos: Record<number, string>
  onSelected(): void
  reorder: (
    network: INetwork,
    placement: 'top' | 'up' | 'down' | 'bottom'
  ) => void
  setScrollOffset: (offset: number) => void
}) => {
  const { networkId, setNetworkId } = useActiveNetworkId()

  const initialState = useInitialNetworkTreeState()

  const parentRef = useRef(null)
  const networksVirtualizer = useVirtualizer({
    count: networks.length,
    initialOffset: initialState.offset,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    getItemKey: (index) => networks[index].id
  })

  useEffect(() => {
    setScrollOffset(networksVirtualizer.scrollOffset)
  }, [networksVirtualizer.scrollOffset, setScrollOffset])

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
                ref={networksVirtualizer.measureElement}
                data-index={item.index}
                position="absolute"
                top={0}
                left={0}
                transform={`translateY(${item.start}px)`}
                w="full"
                minH="56px">
                <NetworkItem
                  network={net}
                  info={info}
                  logo={networkLogos[net.id]}
                  selected={networkId === net.id}
                  onSelected={() => {
                    setNetworkId(net.id!).finally(onSelected)
                  }}
                  reorder={reorder}
                />
              </Box>
            )
          })}
        </Box>
      </Box>
    </Box>
  )
}
