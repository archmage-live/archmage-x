import { Box, HStack, Icon, Stack, Text } from '@chakra-ui/react'
import Avvvatars from 'avvvatars-react'
import { useEffect, useState } from 'react'
import { DraggableProvidedDragHandleProps } from 'react-beautiful-dnd'
import { MdDragIndicator } from 'react-icons/md'

import { NetworkType } from '~lib/network'
import { AppChainInfo as CosmChainInfo } from '~lib/network/cosm'
import { EvmChainInfo } from '~lib/network/evm'
import { INetwork } from '~lib/schema/network'

interface NetworkBasicInfo {
  name: string
  description?: string
  chainId: number | string
  currencySymbol: string
}

export function getBasicInfo(network: INetwork): NetworkBasicInfo {
  switch (network.type) {
    case NetworkType.EVM: {
      const info = network.info as EvmChainInfo
      return {
        name: info.name,
        description: info.title || info.name,
        chainId: info.chainId,
        currencySymbol: info.nativeCurrency.symbol
      }
    }
    case NetworkType.COSM: {
      const info = network.info as CosmChainInfo
      return {
        name: info.chainName,
        description: info.chainName,
        chainId: info.chainId,
        currencySymbol: info.feeCurrencies?.[0].coinDenom
      }
    }
    default:
      return {} as NetworkBasicInfo
  }
}

export const NetworkItem = ({
  info,
  bg,
  hoverBg,
  infoVisible,
  onClick,
  dragHandleProps = {} as DraggableProvidedDragHandleProps
}: {
  info: NetworkBasicInfo
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
          <Avvvatars
            value={info.name}
            displayValue={info.name ? info.name[0] : undefined}
          />
          <Text fontSize="lg" noOfLines={1} userSelect="none">
            {info.name}
          </Text>
        </HStack>

        <HStack
          spacing={4}
          visibility={infoVisibility || 'hidden'}
          _groupHover={{ visibility: infoVisibility || 'visible' }}>
          <Stack fontSize="sm" color="gray.500">
            <Text noOfLines={1} userSelect="none">
              {info.description}
            </Text>
            <HStack>
              <Text userSelect="none">Chain ID: {info.chainId}</Text>
              <Text userSelect="none">Currency: {info.currencySymbol}</Text>
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
