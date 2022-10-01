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

import { reorderSubWallets } from '~lib/services/walletService'
import {
  SelectedWalletId,
  SubWalletEntry
} from '~pages/Popup/WalletDrawer/tree'

import { SubWalletItem } from './SubWalletItem'

interface SubWalletListProps {
  subWallets: SubWalletEntry[]
  onSelectedId: (selected: SelectedWalletId) => void
  measure: () => void
}

export const SubWalletList = ({
  subWallets,
  onSelectedId,
  measure
}: SubWalletListProps) => {
  const [wallets, setWallets] = useState<SubWalletEntry[]>([])
  useEffect(() => {
    setWallets(subWallets)
  }, [subWallets])

  useEffect(measure, [measure, wallets])

  const parentRef = useRef(null)
  const walletsVirtualizer = useVirtualizer({
    count: wallets.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    getItemKey: (index) => wallets[index].subWallet.id
  })

  const bg = useColorModeValue('blue.50', 'blackAlpha.300')
  const hoverBg = useColorModeValue('blue.100', 'gray.800')

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

      const masterId = wallets[0].subWallet.masterId

      const [startSortId, endSortId] = [
        wallets[source.index].subWallet.sortId,
        wallets[destination.index].subWallet.sortId
      ]
      const ws = wallets.slice()
      const [lower, upper] = [
        Math.min(source.index, destination.index),
        Math.max(source.index, destination.index)
      ]
      const sortIds = ws.slice(lower, upper + 1).map((w) => w.subWallet.sortId)
      const [removed] = ws.splice(source.index, 1)
      ws.splice(destination.index, 0, removed)
      for (let index = lower; index <= upper; ++index) {
        ws[index].subWallet.sortId = sortIds[index - lower]
      }
      setWallets(ws)

      await reorderSubWallets(masterId, startSortId, endSortId)
    },
    [wallets]
  )

  if (!wallets.length) {
    return <></>
  }

  return (
    <Box py={2} px={8}>
      <Box borderRadius="xl" px={4} py={3} bg={bg}>
        <Box ref={parentRef} maxH="512px" overflowY="auto">
          <DragDropContext onDragEnd={onDragEnd} onDragStart={onDragStart}>
            <Droppable
              droppableId="list"
              mode="virtual"
              renderClone={(provided, snapshot, rubric) => {
                const wallet = wallets[rubric.source.index]
                return (
                  <Box
                    ref={provided.innerRef}
                    {...provided.dragHandleProps}
                    {...provided.draggableProps}>
                    <SubWalletItem
                      subWallet={wallet}
                      bg={hoverBg}
                      borderColor={wallet.isSelected ? 'purple.500' : undefined}
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
                  <Box
                    h={walletsVirtualizer.getTotalSize() + 'px'}
                    position="relative">
                    {walletsVirtualizer.getVirtualItems().map((item) => {
                      const wallet = wallets[item.index]
                      const {
                        subWallet: { masterId, id },
                        isSelected
                      } = wallet

                      return (
                        <Draggable
                          key={id}
                          draggableId={id + ''}
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
                                <SubWalletItem
                                  subWallet={wallet}
                                  bg={isSelected ? hoverBg : undefined}
                                  hoverBg={hoverBg}
                                  borderColor={
                                    isSelected ? 'purple.500' : undefined
                                  }
                                  infoVisible={
                                    dragIndex !== undefined
                                      ? dragIndex === item.index
                                      : undefined
                                  }
                                  onClick={() =>
                                    onSelectedId({
                                      id: masterId,
                                      subId: id
                                    })
                                  }
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
      </Box>
    </Box>
  )
}
