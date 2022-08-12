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
import { IWallet } from '~lib/schema/wallet'
import {
  WALLET_SERVICE,
  reorderWallets,
  useWallets
} from '~lib/services/walletService'
import { WalletItem } from '~pages/Settings/SettingsWallets/WalletItem'

interface WalletListProps {
  network?: INetwork

  selectedId?: number
  selectedSubId?: number

  onSelectedId(selectedId: number): void

  onSelectedSubId(selectedSubId: number): void
}

export const WalletList = ({
  network,
  selectedId,
  selectedSubId,
  onSelectedId,
  onSelectedSubId
}: WalletListProps) => {
  const ws = useWallets()
  useEffect(() => {
    const effect = async () => {
      if (!network) {
        return
      }
      if (ws) {
        for (const w of ws) {
          await WALLET_SERVICE.ensureSubWalletsInfo(
            w,
            network.kind,
            network.chainId
          )
        }
      }
    }
    effect()
  }, [network, ws])

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
        wallets[source.index].sortId,
        wallets[destination.index].sortId
      ]
      const ws = wallets.slice()
      const [lower, upper] = [
        Math.min(source.index, destination.index),
        Math.max(source.index, destination.index)
      ]
      const sortIds = ws.slice(lower, upper + 1).map((w) => w.sortId)
      const [removed] = ws.splice(source.index, 1)
      ws.splice(destination.index, 0, removed)
      for (let index = lower; index <= upper; ++index) {
        ws[index].sortId = sortIds[index - lower]
      }
      setWallets(ws)

      await reorderWallets(startSortId, endSortId)
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
                  wallet={wallet}
                  bg={hoverBg}
                  borderColor={
                    wallet.id === selectedId ? 'purple.500' : undefined
                  }
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
                              network={network}
                              wallet={wallet}
                              bg={
                                wallet.id === selectedId ? hoverBg : undefined
                              }
                              hoverBg={hoverBg}
                              borderColor={
                                wallet.id === selectedId
                                  ? 'purple.500'
                                  : undefined
                              }
                              infoVisible={
                                dragIndex !== undefined
                                  ? dragIndex === item.index
                                  : undefined
                              }
                              onClick={() => onSelectedId(wallet.id!)}
                              dragHandleProps={provided.dragHandleProps}
                              measureElement={item.measureElement}
                              selectedSubId={selectedSubId}
                              onSelectedSubId={onSelectedSubId}
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
