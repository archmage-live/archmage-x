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

import { IWallet } from '~lib/schema/wallet'
import { useWallets } from '~lib/services/walletService'
import { WalletItem } from '~pages/Settings/SettingsWallets/WalletItem'

interface WalletListProps {
  selectedId?: number

  onSelectedId(selectedId: number): void
}

export const WalletList = ({ selectedId, onSelectedId }: WalletListProps) => {
  const ws = useWallets()
  const [wallets, setWallets] = useState<IWallet[]>([])
  useEffect(() => {
    if (ws) setWallets(ws)
  }, [ws])

  const parentRef = useRef(null)
  const walletsVirtualizer = useVirtualizer({
    count: wallets.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    getItemKey: (index) => wallets[index].id!
  })

  const hoverBg = useColorModeValue('purple.100', 'gray.800')

  const [dragIndex, setDragIndex] = useState<number | undefined>(undefined)

  const onDragStart = useCallback(({ source }: DragStart) => {
    setDragIndex(source.index)
  }, [])

  const onDragEnd = useCallback(async ({ source, destination }: DropResult) => {
    setDragIndex(undefined)

    if (!destination) {
      return
    }
    if (destination.index === source.index) {
      return
    }
  }, [])

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
            const wallet = wallets[rubric.source.index]
            return (
              <Box
                ref={provided.innerRef}
                {...provided.dragHandleProps}
                {...provided.draggableProps}>
                <WalletItem
                  wallet={wallet}
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
              <Box h={walletsVirtualizer.getTotalSize()} position="relative">
                {walletsVirtualizer.getVirtualItems().map((item) => {
                  const wallet = wallets[item.index]
                  return (
                    <Draggable
                      key={wallet.id}
                      draggableId={wallet.id + ''}
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
                            <WalletItem
                              wallet={wallet}
                              bg={
                                wallet.id === selectedId ? hoverBg : undefined
                              }
                              hoverBg={hoverBg}
                              infoVisible={
                                dragIndex !== undefined
                                  ? dragIndex === item.index
                                  : undefined
                              }
                              onClick={() => onSelectedId(wallet.id!)}
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
