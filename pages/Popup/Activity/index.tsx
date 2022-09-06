import { Box, Text, useDisclosure } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useRef, useState } from 'react'

import { useActive } from '~lib/active'
import { ITransaction } from '~lib/schema'
import {
  useEvmTransactionCount,
  useEvmTransactions
} from '~lib/services/transaction/evm'

import { ActivityDetailModal } from './ActivityDetail'
import { ActivityItem } from './ActivityItem'

export default function Activity() {
  const { network, account } = useActive()

  const [count, setCount] = useState(0)

  const totalCount = useEvmTransactionCount(account)
  useEffect(() => {
    setCount((count) =>
      totalCount !== undefined && count === 0 ? Math.min(totalCount, 20) : count
    )
  }, [totalCount])

  const transactions = useEvmTransactions(network, account, count)

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
    if (lastItem.index >= transactions!.length) {
      setCount((count) => {
        if (totalCount > count) {
          return Math.min(count + 20, totalCount)
        }
        return count
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCount, transactions, txVirtualizer.getVirtualItems()])

  const { isOpen, onClose, onOpen } = useDisclosure()
  const [tx, setTx] = useState<ITransaction>()

  return (
    <Box>
      <Box ref={parentRef} maxH={'469px'} overflowY="auto" userSelect="none">
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
            return (
              <Box
                key={tx.id}
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
                    setTx(tx)
                    onOpen()
                  }}
                />
              </Box>
            )
          })}
        </Box>
      </Box>

      {network && tx && (
        <ActivityDetailModal
          network={network}
          tx={tx}
          isOpen={isOpen}
          onClose={onClose}
        />
      )}
    </Box>
  )
}
