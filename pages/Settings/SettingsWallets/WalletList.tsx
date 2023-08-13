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

import {
  localReorderWallets,
  persistReorderWallets
} from '~lib/services/wallet/reorder'
import { SelectedWalletId, WalletEntry } from '~lib/services/wallet/tree'
import { isWalletGroup } from '~lib/wallet'

import { WalletItem } from './WalletItem'

interface WalletListProps {
  walletEntries: WalletEntry[]

  onToggleOpen: (id: number) => void
  onSelected: (selected: SelectedWalletId) => void
}

export const WalletList = ({
  walletEntries,
  onToggleOpen,
  onSelected
}: WalletListProps) => {
  const [wallets, setWallets] = useState<WalletEntry[]>([])
  useEffect(() => {
    setWallets(walletEntries)
  }, [walletEntries])

  const itemSize = 64

  const parentRef = useRef(null)
  const walletsVirtualizer = useVirtualizer({
    count: wallets.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => itemSize,
    getItemKey: (index) => wallets[index].wallet.id
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

      const [ws, startSortId, endSortId] = localReorderWallets(
        wallets,
        source.index,
        destination.index
      )
      setWallets(ws)

      await persistReorderWallets(startSortId, endSortId)
    },
    [wallets]
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
      <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
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
                <WalletItem
                  walletEntry={wallet}
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
                    wallet: { id },
                    isSelected
                  } = wallet

                  return (
                    <Draggable
                      key={id}
                      draggableId={id + ''}
                      index={item.index}>
                      {(provided) => (
                        <Box
                          position="absolute"
                          top={0}
                          left={0}
                          transform={`translateY(${item.start}px)`}
                          w="full"
                          minH="64px">
                          <Box
                            ref={provided.innerRef}
                            {...provided.draggableProps}>
                            <WalletItem
                              walletEntry={wallet}
                              onToggleOpen={onToggleOpen}
                              onSelected={onSelected}
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
                              dragHandleProps={provided.dragHandleProps}
                              measureElement={(el: HTMLElement | null) => {
                                walletsVirtualizer.measureElement(el)
                                walletsVirtualizer.calculateRange()
                              }}
                              index={item.index}
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
