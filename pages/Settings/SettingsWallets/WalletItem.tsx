import { Box, HStack, Icon, Stack, Text, useDisclosure } from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { DraggableProvidedDragHandleProps } from 'react-beautiful-dnd'
import { MdDragIndicator } from 'react-icons/md'
import { useDebounce } from 'react-use'

import { AccountAvatar } from '~components/AccountAvatar'
import { Badge } from '~components/Badge'
import { dayjs } from '~lib/dayjs'
import { INetwork } from '~lib/schema/network'
import { IWallet } from '~lib/schema/wallet'
import { WalletType, getWalletTypeIdentifier } from '~lib/wallet'

import { SubWalletList } from './SubWalletList'

interface WalletItemProps {
  network?: INetwork
  wallet: IWallet
  bg?: string
  hoverBg?: string
  borderColor?: string
  infoVisible?: boolean
  onClick?: () => void
  dragHandleProps?: DraggableProvidedDragHandleProps
  measureElement?: (element?: HTMLElement | null) => any

  selectedSubId?: number

  onSelectedSubId?(selectedSubId: number): void
}

export const WalletItem = ({
  network,
  wallet,
  bg,
  hoverBg,
  borderColor,
  infoVisible,
  onClick,
  dragHandleProps = {} as DraggableProvidedDragHandleProps,
  measureElement,

  selectedSubId,
  onSelectedSubId
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

  const typeIdentifier = getWalletTypeIdentifier(wallet.type)

  return (
    <Box py={1} ref={elRef}>
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
        onDoubleClick={onToggle}
        data-group>
        <HStack spacing={4}>
          <AccountAvatar text={wallet.hash} />
          <HStack w="160px">
            <Text fontSize="lg" noOfLines={1}>
              {wallet.name}
            </Text>
            {typeIdentifier && (
              <Text>
                <Badge>{typeIdentifier}</Badge>
              </Text>
            )}
          </HStack>
        </HStack>

        <HStack
          spacing={4}
          visibility={infoVisibility || 'hidden'}
          _groupHover={{ visibility: infoVisibility || 'visible' }}>
          <Stack fontSize="sm" color="gray.500">
            <Text>Created At: {dayjs(wallet.createdAt).fromNow()}</Text>
          </Stack>
          <Box {...dragHandleProps} p={2}>
            <Icon as={MdDragIndicator} fontSize="xl" />
          </Box>
        </HStack>
      </HStack>

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
