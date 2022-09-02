import { Box, HStack, Icon, Stack, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { DraggableProvidedDragHandleProps } from 'react-beautiful-dnd'
import { MdDragIndicator } from 'react-icons/md'

import { AccountAvatar } from '~components/AccountAvatar'
import { IChainAccount, ISubWallet } from '~lib/schema'
import { shortenAddress } from '~lib/utils'

export const SubWalletItem = ({
  wallet,
  account,
  bg,
  hoverBg,
  borderColor,
  infoVisible,
  onClick,
  dragHandleProps = {} as DraggableProvidedDragHandleProps
}: {
  wallet: ISubWallet
  account?: IChainAccount
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
          <AccountAvatar text={account?.address || ''} />
          <Text fontSize="lg" noOfLines={1} w="160px">
            {wallet.name}
          </Text>
        </HStack>

        <HStack
          spacing={4}
          visibility={infoVisibility || 'hidden'}
          _groupHover={{ visibility: infoVisibility || 'visible' }}>
          <Stack fontSize="sm" color="gray.500">
            <Text noOfLines={1}>
              {shortenAddress(account?.address, {
                prefixChars: 6,
                suffixChars: 6
              })}
            </Text>
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
