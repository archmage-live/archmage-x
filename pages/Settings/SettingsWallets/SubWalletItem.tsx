import { Box, HStack, Icon, Stack, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { DraggableProvidedDragHandleProps } from 'react-beautiful-dnd'
import Blockies from 'react-blockies'
import { MdDragIndicator } from 'react-icons/md'

import { dayjs } from '~lib/dayjs'
import { IDerivedWallet } from '~lib/schema/derivedWallet'
import { IWallet } from '~lib/schema/wallet'
import { WalletType } from '~lib/wallet'

export const SubWalletItem = ({
  wallet,
  bg,
  hoverBg,
  infoVisible,
  onClick,
  dragHandleProps = {} as DraggableProvidedDragHandleProps
}: {
  wallet: IDerivedWallet
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
              seed={`${wallet.masterId}-${wallet.index}`}
              size={10}
              scale={3}
            />
          </Box>
          <Text fontSize="lg" noOfLines={1}>
            {wallet.name}
          </Text>
        </HStack>

        <HStack
          spacing={4}
          visibility={infoVisibility || 'hidden'}
          _groupHover={{ visibility: infoVisibility || 'visible' }}>
          <Stack fontSize="sm" color="gray.500"></Stack>
          <Box {...dragHandleProps} p={2}>
            <Icon as={MdDragIndicator} fontSize="xl" />
          </Box>
        </HStack>
      </HStack>
    </Box>
  )
}
