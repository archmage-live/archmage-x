import { Box, HStack, Text, useDisclosure } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useMemo, useRef, useState } from 'react'

import { useActive } from '~lib/active'
import { useNfts } from '~lib/services/nft'
import { NftDetailModal } from '~pages/Popup/Nfts/NftDetail'

import { NftItem } from './NftItem'

export default function Nfts() {
  const { network, account } = useActive()

  const { nfts } = useNfts(account)

  const rows = Math.ceil((nfts?.length || 0) / 2) // 2 items per row

  const parentRef = useRef(null)
  const virtualizer = useVirtualizer({
    count: rows + 1,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64
  })

  const [nftId, setNftId] = useState<number>()
  const nft = useMemo(() => {
    if (nftId === undefined) {
      return
    }

    return nfts?.find((nft) => nft.id === nftId)
  }, [nfts, nftId])

  const {
    isOpen: isDetailOpen,
    onClose: onDetailClose,
    onOpen: onDetailOpen
  } = useDisclosure()

  return (
    <Box px={4}>
      <Box
        ref={parentRef}
        maxH="calc(100vh - 131px)"
        overflowY="auto"
        userSelect="none">
        <Box h={virtualizer.getTotalSize() + 'px'} position="relative">
          {virtualizer.getVirtualItems().map((item) => {
            if (item.index === 0) {
              return (
                <Text
                  key="title"
                  textAlign="center"
                  fontSize="3xl"
                  fontWeight="medium"
                  py={2}
                  ref={virtualizer.measureElement}
                  data-index={item.index}>
                  NFTs
                </Text>
              )
            }

            if (!nfts) {
              return <></>
            }

            const rowNfts = nfts.slice(2 * (item.index - 1), 2 * item.index)

            return (
              <HStack
                key={rowNfts[0].id}
                position="absolute"
                top={0}
                left={0}
                transform={`translateY(${item.start}px)`}
                w="full"
                minH={64 + 'px'}
                py={2}
                spacing={4}
                ref={virtualizer.measureElement}
                data-index={item.index}>
                {rowNfts.map((nft) => {
                  return (
                    <NftItem
                      key={nft.id}
                      nft={nft}
                      onClick={() => {
                        setNftId(nft.id)
                        onDetailOpen()
                      }}
                    />
                  )
                })}
              </HStack>
            )
          })}
        </Box>
      </Box>

      {network && nft && (
        <NftDetailModal
          network={network}
          nft={nft}
          isOpen={isDetailOpen}
          onClose={onDetailClose}
        />
      )}
    </Box>
  )
}
