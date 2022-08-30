import { Box, Text, useDisclosure } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useRef, useState } from 'react'

import { ITransaction } from '~lib/schema'
import {
  useEvmTransactionCount,
  useEvmTransactions
} from '~lib/services/transaction/evm'
import { useChainAccountByIndex } from '~lib/services/walletService'
import { ActivityDetailModal } from '~pages/Popup/Activity/ActivityDetail'
import { ActivityItem } from '~pages/Popup/Activity/ActivityItem'

import { useActiveWallet, useSelectedNetwork } from '../select'

export default function Activity() {
  const { selectedNetwork: network } = useSelectedNetwork()
  const { wallet, subWallet } = useActiveWallet()

  const account = useChainAccountByIndex(
    wallet?.id,
    network?.kind,
    network?.chainId,
    subWallet?.index
  )

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
    count: (transactions?.length || 0) + 1,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 77
  })

  const { isOpen, onClose, onOpen } = useDisclosure()
  const [tx, setTx] = useState<ITransaction>()

  return (
    <Box>
      <Box
        ref={parentRef}
        maxH={8 * 77 + 'px'}
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

            const tx = transactions![item.index - 1]
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
