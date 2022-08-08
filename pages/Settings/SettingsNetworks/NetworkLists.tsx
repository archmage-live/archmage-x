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
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DragDropContext,
  DragStart,
  Draggable,
  DraggableProvidedDragHandleProps,
  DropResult,
  Droppable,
  DroppableProvided
} from 'react-beautiful-dnd'
import { MdDragIndicator } from 'react-icons/md'

import { NetworkType } from '~lib/network'
import { AppChainInfo as CosmChainInfo } from '~lib/network/cosm'
import { EvmChainInfo } from '~lib/network/evm'
import { INetwork } from '~lib/schema/network'
import { reorderNetworks } from '~lib/services/network'

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

const NetworkItem = ({
  info,
  bg,
  hoverBg,
  infoVisible,
  onClick,
  dragHandleProps = {} as DraggableProvidedDragHandleProps
}: {
  info: NetworkBasicInfo
  bg?: string
  hoverBg?: string
  infoVisible?: boolean
  onClick?: () => void
  dragHandleProps?: DraggableProvidedDragHandleProps
}) => {
  const infoVisibility = infoVisible
    ? 'visible'
    : infoVisible === false
    ? 'hidden'
    : ''

  const [transition, setTransition] = useState<string>()
  useEffect(() => {
    if (infoVisible === undefined) {
      setTimeout(() => setTransition('background 0.1s ease-out'), 200)
    } else {
      setTransition(undefined)
    }
  }, [infoVisible])

  return (
    <Box py={1}>
      <HStack
        px={4}
        py={2}
        spacing={8}
        align="center"
        borderRadius="xl"
        justify="space-between"
        cursor="pointer"
        bg={bg}
        _hover={{ bg: hoverBg }}
        transition={transition}
        onClick={onClick}
        data-group>
        <HStack spacing={4}>
          <Avvvatars
            value={info.name}
            displayValue={info.name ? info.name[0] : undefined}
          />
          <Text fontSize="lg" noOfLines={1} userSelect="none">
            {info.name}
          </Text>
        </HStack>

        <HStack
          spacing={4}
          visibility={infoVisibility || 'hidden'}
          _groupHover={{ visibility: infoVisibility || 'visible' }}>
          <Stack fontSize="sm" color="gray.500">
            <Text noOfLines={1} userSelect="none">
              {info.description}
            </Text>
            <HStack>
              <Text userSelect="none">Chain ID: {info.chainId}</Text>
              <Text userSelect="none">Currency: {info.currencySymbol}</Text>
            </HStack>
          </Stack>
          <Box {...dragHandleProps} p={2}>
            <Icon as={MdDragIndicator} fontSize="xl" />
          </Box>
        </HStack>
      </HStack>
    </Box>
  )
}

export const NetworksLists = ({
  networks: nets,
  selectedId,
  onSelectedId
}: {
  networks: INetwork[]
  selectedId?: number
  onSelectedId(selectedId: number): void
}) => {
  const [networks, setNetworks] = useState<INetwork[]>([])
  useEffect(() => {
    setNetworks(nets)
  }, [nets])

  const parentRef = useRef(null)
  const netsVirtualizer = useVirtualizer({
    count: networks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    getItemKey: (index) => networks[index].id!
  })

  const hoverBg = useColorModeValue('purple.100', 'gray.800')

  const [dragIndex, setDragIndex] = useState<number | undefined>(undefined)

  const onDragStart = useCallback(({ source }: DragStart) => {
    setDragIndex(source.index)
  }, [])

  const onDragEnd = useCallback(
    async ({ source, destination }: DropResult) => {
      setDragIndex(undefined)

      if (!destination) {
        return
      }
      if (destination.index === source.index) {
        return
      }
      const [startSortId, endSortId] = [
        networks[source.index].sortId,
        networks[destination.index].sortId
      ]
      const nets = networks.slice()
      const [lower, upper] = [
        Math.min(source.index, destination.index),
        Math.max(source.index, destination.index)
      ]
      const sortIds = nets.slice(lower, upper + 1).map((net) => net.sortId)
      const [removed] = nets.splice(source.index, 1)
      nets.splice(destination.index, 0, removed)
      for (let index = lower; index <= upper; ++index) {
        nets[index].sortId = sortIds[index - lower]
      }
      setNetworks(nets)

      await reorderNetworks(startSortId, endSortId)
    },
    [networks]
  )

  return (
    <Box
      ref={parentRef}
      maxH="540px"
      overflowY="auto"
      borderRadius="xl"
      p="14px"
      bg={useColorModeValue('purple.50', 'blackAlpha.400')}>
      <DragDropContext onDragEnd={onDragEnd} onDragStart={onDragStart}>
        <Droppable
          droppableId="list"
          mode="virtual"
          renderClone={(provided, snapshot, rubric) => {
            const net = networks[rubric.source.index]
            const info = getBasicInfo(net)
            return (
              <Box
                ref={provided.innerRef}
                {...provided.dragHandleProps}
                {...provided.draggableProps}>
                <NetworkItem
                  info={info}
                  bg={hoverBg}
                  infoVisible={
                    dragIndex !== undefined
                      ? dragIndex === rubric.source.index
                      : undefined
                  }
                />
              </Box>
            )
          }}>
          {(provided: DroppableProvided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              <Box h={netsVirtualizer.getTotalSize()} position="relative">
                {netsVirtualizer.getVirtualItems().map((item) => {
                  const net = networks[item.index]
                  const info = getBasicInfo(net)
                  return (
                    <Draggable
                      key={net.id}
                      draggableId={net.id + ''}
                      index={item.index}>
                      {(provided) => (
                        <Box
                          ref={item.measureElement}
                          position="absolute"
                          top={0}
                          left={0}
                          transform={`translateY(${item.start}px)`}
                          w="full"
                          h="64px">
                          <Box
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            h="full">
                            <NetworkItem
                              info={info}
                              bg={net.id === selectedId ? hoverBg : undefined}
                              hoverBg={hoverBg}
                              infoVisible={
                                dragIndex !== undefined
                                  ? dragIndex === item.index
                                  : undefined
                              }
                              onClick={() => onSelectedId(net.id!)}
                              dragHandleProps={provided.dragHandleProps}
                            />
                          </Box>
                        </Box>
                      )}
                    </Draggable>
                  )
                })}
              </Box>
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </Box>
  )
}
