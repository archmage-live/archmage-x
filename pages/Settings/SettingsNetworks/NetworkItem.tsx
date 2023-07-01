import { Box, HStack, Icon, Image, Stack, Text } from '@chakra-ui/react'
import { MdDragIndicator } from '@react-icons/all-files/md/MdDragIndicator'
import Avvvatars from 'avvvatars-react'
import { useEffect, useState } from 'react'
import { DraggableProvidedDragHandleProps } from 'react-beautiful-dnd'

import { INetwork } from '~lib/schema'
import { NetworkInfo, useNetworkLogoUrl } from '~lib/services/network'
import { shortenString } from '~lib/utils'

export const NetworkItem = ({
  network,
  info,
  bg,
  hoverBg,
  infoVisible,
  onClick,
  dragHandleProps = {} as DraggableProvidedDragHandleProps
}: {
  network: INetwork
  info: NetworkInfo
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

  const networkLogoUrl = useNetworkLogoUrl(network)

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
          <Image
            borderRadius="full"
            boxSize="32px"
            fit="cover"
            src={networkLogoUrl}
            fallback={
              <Avvvatars
                value={info.name}
                displayValue={info.name ? info.name[0] : undefined}
              />
            }
            alt="Network Logo"
          />
          <Text fontSize="lg" noOfLines={1}>
            {info.name}
          </Text>
        </HStack>

        <HStack
          spacing={4}
          visibility={infoVisibility || 'hidden'}
          _groupHover={{ visibility: infoVisibility || 'visible' }}>
          <Stack fontSize="sm" color="gray.500">
            <Text noOfLines={1}>{info.description}</Text>
            <HStack>
              <Text>Chain ID: {shortenString(String(info.chainId))}</Text>
              <Text>Currency: {info.currencySymbol}</Text>
            </HStack>
          </Stack>
          <Box {...dragHandleProps} p={2}>
            <Icon as={MdDragIndicator} fontSize="xl" />
          </Box>
        </HStack>
      </HStack>
    </Box>
  )
}
