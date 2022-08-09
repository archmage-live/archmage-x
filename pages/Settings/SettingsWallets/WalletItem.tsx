import { Box, HStack, Icon, Stack, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { DraggableProvidedDragHandleProps } from 'react-beautiful-dnd'
import Blockies from 'react-blockies'
import { MdDragIndicator } from 'react-icons/md'

import { dayjs } from '~lib/dayjs'
import { IWallet } from '~lib/schema/wallet'
import { WalletType } from '~lib/wallet'

function getWalletType(type: WalletType) {
  switch (type) {
    case WalletType.HD:
      return 'Hierarchical Deterministic (HD) Wallet'
    case WalletType.MNEMONIC_PRIVATE_KEY:
    // pass through
    case WalletType.PRIVATE_KEY:
      return 'Simple Wallet'
    case WalletType.LEDGER:
      return 'Ledger Wallet'
  }
}

export const WalletItem = ({
  wallet,
  bg,
  hoverBg,
  infoVisible,
  onClick,
  dragHandleProps = {} as DraggableProvidedDragHandleProps
}: {
  wallet: IWallet
  bg?: string
  hoverBg?: string
  infoVisible?: boolean
  onClick?: () => void
  dragHandleProps?: DraggableProvidedDragHandleProps
}) => {
  const infoVisibility = infoVisible
    ? 'visible'
    : infoVisible === false
    ? 'hidden'
    : ''

  const [transition, setTransition] = useState<string>()
  useEffect(() => {
    if (infoVisible === undefined) {
      setTimeout(() => setTransition('background 0.1s ease-out'), 200)
    } else {
      setTransition(undefined)
    }
  }, [infoVisible])

  return (
    <Box py={1}>
      <HStack
        px={4}
        py={2}
        spacing={8}
        align="center"
        borderRadius="xl"
        justify="space-between"
        cursor="pointer"
        bg={bg}
        _hover={{ bg: hoverBg }}
        transition={transition}
        onClick={onClick}
        data-group>
        <HStack spacing={4}>
          <Box borderRadius="50%" overflow="hidden">
            <Blockies
              seed={wallet.hash}
              size={10}
              scale={3}
            />
          </Box>
          <Text fontSize="lg" noOfLines={1} userSelect="none">
            {wallet.name}
          </Text>
        </HStack>

        <HStack
          spacing={4}
          visibility={infoVisibility || 'hidden'}
          _groupHover={{ visibility: infoVisibility || 'visible' }}>
          <Stack fontSize="sm" color="gray.500">
            <Text noOfLines={1} userSelect="none">
              {getWalletType(wallet.type)}
            </Text>
            <Text userSelect="none">
              Created At: {dayjs(wallet.createdAt).fromNow()}
            </Text>
          </Stack>
          <Box {...dragHandleProps} p={2}>
            <Icon as={MdDragIndicator} fontSize="xl" />
          </Box>
        </HStack>
      </HStack>
    </Box>
  )
}
