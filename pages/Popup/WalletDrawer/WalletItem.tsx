import { CheckIcon } from '@chakra-ui/icons'
import { Box, Button, HStack, Text, useDisclosure } from '@chakra-ui/react'
import { useCallback, useEffect, useRef } from 'react'
import Blockies from 'react-blockies'

import { ActiveWalletId } from '~lib/active'
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
  activeId?: ActiveWalletId
  onClose?: () => void
  measureElement?: (element?: HTMLElement | null) => any
}

export const WalletItem = ({
  network,
  wallet,
  selected,
  onSelected,
  selectedSubId,
  onSelectedSubId,
  activeId,
  onClose,
  measureElement
}: WalletItemProps) => {
  const elRef = useRef(null)
  const { isOpen, onToggle } = useDisclosure()

  const measure = useCallback(() => {
    measureElement?.(elRef.current)
  }, [measureElement])

  useEffect(() => {
    measure()
  }, [isOpen, measure])

  return (
    <Box ref={elRef}>
      <Button
        key={wallet.id}
        variant="ghost"
        size="lg"
        w="full"
        h={16}
        px={4}
        justifyContent="start"
        onClick={() => {
          onSelected?.()
          if (wallet.type === WalletType.HD) {
            onToggle()
          } else {
            onClose?.()
          }
        }}>
        <HStack w="full" justify="space-between">
          <HStack w="calc(100% - 29.75px)" justify="space-between">
            <Box
              borderRadius="50%"
              overflow="hidden"
              transform="scale(0.8)"
              m="-3px">
              <Blockies seed={wallet.hash} size={10} scale={3} />
            </Box>

            <HStack w="calc(100% - 31px)" justify="space-between">
              <Text fontSize="lg" noOfLines={1} display="block">
                {wallet.name}
              </Text>
            </HStack>
          </HStack>

          {activeId?.masterId === wallet.id && (
            <CheckIcon fontSize="lg" color="green.500" />
          )}
        </HStack>
      </Button>

      {isOpen && network && wallet.type === WalletType.HD && (
        <SubWalletList
          network={network}
          masterId={wallet.id!}
          selectedId={selectedSubId}
          onSelectedId={(id) => {
            onSelectedSubId?.(id)
            onClose?.()
          }}
          activeId={activeId}
          measure={measure}
        />
      )}
    </Box>
  )
}
