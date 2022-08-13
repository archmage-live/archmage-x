import { Box, useColorModeValue } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DragDropContext,
  DragStart,
  Draggable,
  DropResult,
  Droppable,
  DroppableProvided
} from 'react-beautiful-dnd'

import { INetwork } from '~lib/schema/network'
import { getNetworkInfo, reorderNetworks } from '~lib/services/network'

import { NetworkItem } from './NetworkItem'

export const NetworkList = ({
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
  const networksVirtualizer = useVirtualizer({
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

      // local sort
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

      // async persist sort
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
      userSelect="none"
      bg={useColorModeValue('purple.50', 'blackAlpha.400')}>
      <DragDropContext onDragEnd={onDragEnd} onDragStart={onDragStart}>
        <Droppable
          droppableId="list"
          mode="virtual"
          renderClone={(provided, snapshot, rubric) => {
            const net = networks[rubric.source.index]
            const info = getNetworkInfo(net)
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
              <Box h={networksVirtualizer.getTotalSize()} position="relative">
                {networksVirtualizer.getVirtualItems().map((item) => {
                  const net = networks[item.index]
                  const info = getNetworkInfo(net)
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
