import { Box, useColorModeValue } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DragDropContext,
  DragStart,
  Draggable,
  DropResult,
  Droppable,
  DroppableProvided
} from 'react-beautiful-dnd'
import { useDebounce } from 'react-use'

import { IDerivedWallet, INetwork, IWalletInfo } from '~lib/schema'
import {
  reorderSubWallets,
  useSubWallets,
  useSubWalletsInfo
} from '~lib/services/walletService'

import { SubWalletItem } from './SubWalletItem'

interface SubWalletListProps {
  network: INetwork
  masterId: number
  selectedId?: number

  onSelectedId(selectedId: number): void

  measure(): void
}

export const SubWalletList = ({
  network,
  masterId,
  selectedId,
  onSelectedId,
  measure
}: SubWalletListProps) => {
  const sw = useSubWallets(masterId)
  const [wallets, setWallets] = useState<IDerivedWallet[]>([])
  useEffect(() => {
    if (sw) setWallets(sw)
  }, [sw])

  useDebounce(measure, 50, [measure, wallets])

  const infos = useSubWalletsInfo(masterId, network.kind, network.chainId)
  const infoMap = useMemo(() => {
    const m = new Map<string, IWalletInfo>()
    infos?.forEach((info) => m.set(`${info.masterId}-${info.index}`, info))
    return m
  }, [infos])

  const parentRef = useRef(null)
  const walletsVirtualizer = useVirtualizer({
    count: wallets.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    getItemKey: (index) => wallets[index].id!
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

      await reorderSubWallets(masterId, startSortId, endSortId)
    },
    [masterId, wallets]
  )

  if (!wallets.length) {
    return <></>
  }

  return (
    <Box py={2} px={8}>
      <Box
        ref={parentRef}
        maxH="540px"
        overflowY="auto"
        borderRadius="xl"
        p="14px"
        bg={bg}>
        <DragDropContext onDragEnd={onDragEnd} onDragStart={onDragStart}>
          <Droppable
            droppableId="list"
            mode="virtual"
            renderClone={(provided, snapshot, rubric) => {
              const wallet = wallets[rubric.source.index]
              const info = infoMap.get(`${wallet.masterId}-${wallet.index}`)
              return (
                <Box
                  ref={provided.innerRef}
                  {...provided.dragHandleProps}
                  {...provided.draggableProps}>
                  <SubWalletItem
                    wallet={wallet}
                    info={info}
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
                <Box h={walletsVirtualizer.getTotalSize() + 'px'} position="relative">
                  {walletsVirtualizer.getVirtualItems().map((item) => {
                    const wallet = wallets[item.index]
                    const info = infoMap.get(
                      `${wallet.masterId}-${wallet.index}`
                    )
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
                              <SubWalletItem
                                wallet={wallet}
                                info={info}
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
  )
}
