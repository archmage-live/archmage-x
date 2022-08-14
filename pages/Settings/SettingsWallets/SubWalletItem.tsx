import { Box, HStack, Icon, Stack, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { DraggableProvidedDragHandleProps } from 'react-beautiful-dnd'
import Blockies from 'react-blockies'
import { MdDragIndicator } from 'react-icons/md'

import { IDerivedWallet, IWalletInfo } from '~lib/schema'
import { shortenAddress } from '~lib/utils'

export const SubWalletItem = ({
  wallet,
  info,
  bg,
  hoverBg,
  borderColor,
  infoVisible,
  onClick,
  dragHandleProps = {} as DraggableProvidedDragHandleProps
}: {
  wallet: IDerivedWallet
  info?: IWalletInfo
  bg?: string
  hoverBg?: string
  borderColor?: string
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
        borderWidth="1px"
        borderColor={borderColor}
        justify="space-between"
        cursor="pointer"
        bg={bg}
        _hover={{ bg: hoverBg }}
        transition={transition}
        onClick={onClick}
        data-group>
        <HStack spacing={4}>
          <Box borderRadius="50%" overflow="hidden">
            <Blockies seed={info?.address + ''} size={10} scale={3} />
          </Box>
          <Text fontSize="lg" noOfLines={1} w="200px">
            {wallet.name}
          </Text>
        </HStack>

        <HStack
          spacing={4}
          visibility={infoVisibility || 'hidden'}
          _groupHover={{ visibility: infoVisibility || 'visible' }}>
          <Stack fontSize="sm" color="gray.500">
            <Text noOfLines={1}>{shortenAddress(info?.address, 6)}</Text>
            <Text>Index: {wallet.index}</Text>
          </Stack>
          <Box {...dragHandleProps} p={2}>
            <Icon as={MdDragIndicator} fontSize="xl" />
          </Box>
        </HStack>
      </HStack>
    </Box>
  )
}
