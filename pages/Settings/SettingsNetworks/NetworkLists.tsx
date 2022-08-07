import {
  Box,
  HStack,
  Icon,
  Stack,
  Text,
  useColorModeValue
} from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import Avvvatars from 'avvvatars-react'
import { useRef } from 'react'
import { MdDragIndicator } from 'react-icons/md'

import { NetworkType } from '~lib/network'
import { AppChainInfo as CosmChainInfo } from '~lib/network/cosm'
import { EvmChainInfo } from '~lib/network/evm'
import { INetwork } from '~lib/schema/network'

interface NetworkBasicInfo {
  name: string
  description?: string
  chainId: number | string
  currencySymbol: string
}

function getBasicInfo(network: INetwork): NetworkBasicInfo {
  switch (network.type) {
    case NetworkType.EVM: {
      const info = network.info as EvmChainInfo
      return {
        name: info.name,
        description: info.title || info.name,
        chainId: info.chainId,
        currencySymbol: info.nativeCurrency.symbol
      }
    }
    case NetworkType.COSM: {
      const info = network.info as CosmChainInfo
      return {
        name: info.chainName,
        description: info.chainName,
        chainId: info.chainId,
        currencySymbol: info.feeCurrencies?.[0].coinDenom
      }
    }
    default:
      return {} as NetworkBasicInfo
  }
}

export const NetworksLists = ({
  networks,
  selected,
  onSelected
}: {
  networks: INetwork[]
  selected?: number
  onSelected(selected: number): void
}) => {
  const parentRef = useRef(null)
  const netsVirtualizer = useVirtualizer({
    count: networks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64
  })

  const hoverBg = useColorModeValue('purple.100', 'gray.800')

  return (
    <Box
      ref={parentRef}
      maxH="540px"
      overflowY="auto"
      borderRadius="xl"
      p="14px"
      bg={useColorModeValue('purple.50', 'blackAlpha.400')}>
      <Box h={netsVirtualizer.getTotalSize()} position="relative">
        {netsVirtualizer.getVirtualItems().map((item) => {
          const net = networks![item.index]
          const info = getBasicInfo(net)
          return (
            <Box
              key={item.key}
              ref={item.measureElement}
              position="absolute"
              top={0}
              left={0}
              transform={`translateY(${item.start}px)`}
              w="full"
              h="64px"
              py={1}>
              <HStack
                px={4}
                py={2}
                spacing={8}
                align="center"
                borderRadius="xl"
                justify="space-between"
                cursor="pointer"
                bg={item.index === selected ? hoverBg : undefined}
                _hover={{ bg: hoverBg }}
                transition="background 0.1s ease-out"
                onClick={() => onSelected(item.index)}
                data-group>
                <HStack spacing={4}>
                  <Avvvatars
                    value={info.name}
                    displayValue={info.name ? info.name[0] : undefined}
                  />
                  <Text fontSize="lg" noOfLines={1}>
                    {info.name}
                  </Text>
                </HStack>

                <HStack
                  spacing={4}
                  visibility="hidden"
                  _groupHover={{ visibility: 'visible' }}>
                  <Stack fontSize="sm" color="gray.500">
                    <Text noOfLines={1}>{info.description}</Text>
                    <HStack>
                      <Text>Chain ID: {info.chainId}</Text>
                      <Text>Currency: {info.currencySymbol}</Text>
                    </HStack>
                  </Stack>
                  <Icon as={MdDragIndicator} fontSize="xl" />
                </HStack>
              </HStack>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
