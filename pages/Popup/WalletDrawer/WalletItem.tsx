import { Box, Button, HStack, Text, useDisclosure } from '@chakra-ui/react'
import { useCallback, useRef } from 'react'
import Blockies from 'react-blockies'
import { useDebounce } from 'react-use'

import { INetwork } from '~lib/schema/network'
import { IWallet } from '~lib/schema/wallet'
import { WalletType } from '~lib/wallet'

import { SubWalletList } from './SubWalletList'

interface WalletItemProps {
  network?: INetwork
  wallet: IWallet
  selected?: boolean
  onSelected?: () => void
  selectedSubId?: number
  onSelectedSubId?: (selectedSubId: number) => void
  measureElement?: (element?: HTMLElement | null) => any
}

export const WalletItem = ({
  network,
  wallet,
  selected,
  onSelected,
  selectedSubId,
  onSelectedSubId,
  measureElement
}: WalletItemProps) => {
  const elRef = useRef(null)
  const { isOpen, onToggle } = useDisclosure()

  const measure = useCallback(() => {
    measureElement?.(elRef.current)
  }, [measureElement])

  useDebounce(
    () => {
      measure()
    },
    50,
    [isOpen, measure]
  )

  return (
    <Box py={1} ref={elRef}>
      <Button
        key={wallet.id}
        variant="ghost"
        w="full"
        justifyContent="start"
        isActive={selected}
        onClick={() => {
          onSelected?.()
          onToggle()
        }}>
        <HStack spacing={4}>
          <Box borderRadius="50%" overflow="hidden">
            <Blockies seed={wallet.hash} size={10} scale={3} />
          </Box>
          <Text fontSize="lg" noOfLines={1}>
            {wallet.name}
          </Text>
        </HStack>
      </Button>

      {isOpen && network && wallet.type === WalletType.HD && (
        <SubWalletList
          network={network}
          masterId={wallet.id!}
          selectedId={selectedSubId}
          onSelectedId={(id) => onSelectedSubId?.(id)}
          measure={measure}
        />
      )}
    </Box>
  )
}
