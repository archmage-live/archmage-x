import {
  Box,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  Input,
  SimpleGrid,
  Stack,
  Text,
  useColorModeValue
} from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import Avvvatars from 'avvvatars-react'
import { useEffect, useRef, useState } from 'react'
import { MdDragIndicator } from 'react-icons/md'

import { EvmChainInfo } from '~lib/network/evm'
import { INetwork } from '~lib/schema/network'
import { useEvmNetworks } from '~lib/services/network/evmService'

const NetworksLists = ({
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

  const hoverBg = useColorModeValue('gray.50', 'gray.800')

  return (
    <Box ref={parentRef} h="200px" overflowY="auto">
      <Box h={netsVirtualizer.getTotalSize()} position="relative">
        {netsVirtualizer.getVirtualItems().map((item) => {
          const net = networks![item.index]
          const info = net.info as EvmChainInfo
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
                onClick={() => onSelected(item.index)}
                data-group>
                <HStack spacing={4}>
                  <Avvvatars
                    value={info.name}
                    displayValue={info.name ? info.name[0] : undefined}
                  />
                  <Text fontSize="xl">{info.name}</Text>
                </HStack>

                <HStack
                  spacing={4}
                  visibility="hidden"
                  _groupHover={{ visibility: 'visible' }}>
                  <Stack fontSize="sm" color="gray.500">
                    <Text>{info.title || info.name}</Text>
                    <HStack>
                      <Text>Chain ID: {info.chainId}</Text>
                      <Text>Currency: {info.nativeCurrency.symbol}</Text>
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

const NetworkDetail = ({ network }: { network: INetwork }) => {
  const [info, setInfo] = useState<EvmChainInfo>()
  useEffect(() => {
    setInfo(network.info)
  }, [network])

  return (
    <Stack spacing="12">
      <FormControl>
        <FormLabel>Network Name</FormLabel>
        <Input size="lg" value={info?.name} />
      </FormControl>

      <FormControl>
        <FormLabel>Chain ID</FormLabel>
        <Input size="lg" value={info?.chainId} />
      </FormControl>

      <FormControl>
        <FormLabel>Currency symbol</FormLabel>
        <Input size="lg" value={info?.nativeCurrency.symbol} />
      </FormControl>

      <FormControl>
        <FormLabel>RPC URL</FormLabel>
        <Input size="lg" value={info?.rpc[0]} />
      </FormControl>

      <FormControl>
        <FormLabel>Block Explorer URL</FormLabel>
        <Input size="lg" value={info?.explorers[0].url} />
      </FormControl>
    </Stack>
  )
}

export const SettingsNetworks = () => {
  const evmNetworks = useEvmNetworks()
  const [selected, setSelected] = useState(0)

  return (
    <Stack spacing={12}>
      {evmNetworks && (
        <SimpleGrid columns={2} spacing={16}>
          <Box>
            <NetworksLists
              networks={evmNetworks}
              selected={selected}
              onSelected={setSelected}
            />
          </Box>

          <Box>
            <NetworkDetail network={evmNetworks[selected]} />
          </Box>
        </SimpleGrid>
      )}
    </Stack>
  )
}
