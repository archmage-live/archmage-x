import { Box, Text, useDisclosure } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useActive } from '~lib/active'
import { IPendingTx } from '~lib/schema'
import { EvmTxType } from '~lib/services/datasource/etherscan'
import { useEvmTransactionsMixed } from '~lib/services/transaction/evm'

import { ActivityDetailModal } from './ActivityDetail'
import { ActivityItem } from './ActivityItem'
import { EvmSpeedUpOrCancelModal } from './EvmSpeedUpOrCancelModal'

export default function Activity() {
  const { network, account } = useActive()

  const [count, setCount] = useState(0)

  const { txTotal: totalCount, txs: transactions } = useEvmTransactionsMixed(
    EvmTxType.NORMAL,
    network,
    account,
    count
  )

  useEffect(() => {
    if (totalCount === undefined) {
      return
    }
    setCount((count) => {
      if (count === 0) {
        count = 20
      }
      return Math.min(count, totalCount)
    })
  }, [totalCount])

  const parentRef = useRef(null)
  const txVirtualizer = useVirtualizer({
    count:
      (transactions?.length || 0) +
      1 +
      (totalCount !== undefined && totalCount > count ? 1 : 0),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 77
  })

  useEffect(() => {
    const virtualItems = txVirtualizer.getVirtualItems()
    if (!virtualItems.length || totalCount === undefined || !transactions) {
      return
    }
    const lastItem = virtualItems[virtualItems.length - 1]
    if (lastItem.index >= transactions.length) {
      setCount((count) => {
        if (totalCount > count) {
          return Math.min(count + 20, totalCount)
        }
        return count
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCount, transactions, txVirtualizer.getVirtualItems()])

  const {
    isOpen: isDetailOpen,
    onClose: onDetailClose,
    onOpen: onDetailOpen
  } = useDisclosure()

  const [txId, setTxId] = useState<{ id: number; isPending: boolean }>()
  const tx = useMemo(() => {
    if (!txId) {
      return
    }
    return transactions?.find((tx) => {
      const isPending = typeof (tx as IPendingTx).nonce === 'number'
      return tx.id === txId.id && isPending === txId.isPending
    })
  }, [transactions, txId])

  const {
    isOpen: isSpeedUpOpen,
    onOpen: onSpeedUpOpen,
    onClose: onSpeedUpClose
  } = useDisclosure()

  const [isSpeedUp, setIsSpeedUp] = useState(false)

  return (
    <Box px={4}>
      <Box
        ref={parentRef}
        maxH="calc(100vh - 131px)"
        overflowY="auto"
        userSelect="none">
        <Box h={txVirtualizer.getTotalSize() + 'px'} position="relative">
          {txVirtualizer.getVirtualItems().map((item) => {
            if (item.index === 0) {
              return (
                <Text
                  key="title"
                  textAlign="center"
                  fontSize="3xl"
                  fontWeight="medium"
                  py={2}
                  ref={item.measureElement}>
                  Recent Activity
                </Text>
              )
            }

            if (!transactions) {
              return <Box key="empty" ref={item.measureElement}></Box>
            }

            if (item.index > transactions.length) {
              return (
                <Box
                  key="load"
                  position="absolute"
                  top={0}
                  left={0}
                  transform={`translateY(${item.start}px)`}
                  w="full"
                  minH={77 + 'px'}
                  py={2}
                  ref={item.measureElement}>
                  <Text textAlign="center" fontSize="sm">
                    Load More...
                  </Text>
                </Box>
              )
            }

            const tx = transactions[item.index - 1]
            const isPending = typeof (tx as IPendingTx).nonce === 'number'

            return (
              <Box
                key={!isPending ? tx.id : `${tx.id}-pending`}
                position="absolute"
                top={0}
                left={0}
                transform={`translateY(${item.start}px)`}
                w="full"
                minH={77 + 'px'}
                py={2}
                ref={item.measureElement}>
                <ActivityItem
                  network={network!}
                  tx={tx}
                  onClick={() => {
                    setTxId({
                      id: tx.id,
                      isPending
                    })
                    onDetailOpen()
                  }}
                  onSpeedUp={(isSpeedUp) => {
                    setIsSpeedUp(isSpeedUp)
                    setTxId({
                      id: tx.id,
                      isPending
                    })
                    onSpeedUpOpen()
                  }}
                />
              </Box>
            )
          })}
        </Box>
      </Box>

      {!count && (
        <Text
          textAlign="center"
          fontSize="xl"
          fontWeight="medium"
          color="gray.500">
          No Activity
        </Text>
      )}

      {network && tx && (
        <ActivityDetailModal
          network={network}
          tx={tx}
          isOpen={isDetailOpen}
          onClose={onDetailClose}
        />
      )}

      {network && tx && typeof (tx as IPendingTx).nonce === 'number' && (
        <EvmSpeedUpOrCancelModal
          isOpen={isSpeedUpOpen}
          onClose={onSpeedUpClose}
          network={network}
          tx={tx}
          isSpeedUp={isSpeedUp}
        />
      )}
    </Box>
  )
}
