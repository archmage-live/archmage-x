import { Box, HStack, Icon, Stack, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { DraggableProvidedDragHandleProps } from 'react-beautiful-dnd'
import { MdDragIndicator } from 'react-icons/md'
import { useDebounce } from 'react-use'

import { AccountAvatar } from '~components/AccountAvatar'
import { Badge } from '~components/Badge'
import { TypeBadge } from '~components/TypeBadge'
import { dayjs } from '~lib/dayjs'
import { shortenAddress } from '~lib/utils'
import { getWalletTypeIdentifier, isWalletGroup } from '~lib/wallet'
import { SelectedWalletId, WalletEntry } from '~pages/Popup/WalletDrawer/tree'

import { SubWalletList } from './SubWalletList'

interface WalletItemProps {
  walletEntry: WalletEntry
  onToggleOpen?: (id: number) => void
  onSelected?: (selected: SelectedWalletId) => void

  bg?: string
  hoverBg?: string
  borderColor?: string
  infoVisible?: boolean

  dragHandleProps?: DraggableProvidedDragHandleProps
  measureElement?: (element?: HTMLElement | null) => any
}

export const WalletItem = ({
  walletEntry,
  onToggleOpen,
  onSelected,
  bg,
  hoverBg,
  borderColor,
  infoVisible,
  dragHandleProps = {} as DraggableProvidedDragHandleProps,
  measureElement
}: WalletItemProps) => {
  const { wallet, isOpen, subWallets } = walletEntry

  const elRef = useRef(null)

  const measure = useCallback(() => {
    measureElement?.(elRef.current)
  }, [measureElement])

  useEffect(() => {
    measure()
  }, [isOpen, measure])

  const subWallet = !isWalletGroup(wallet.type) ? subWallets[0] : undefined
  const account = subWallet?.account

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

  const typeIdentifier = getWalletTypeIdentifier(wallet)

  return (
    <Box ref={elRef}>
      <Box h="64px" py={1}>
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
          onClick={() => {
            onSelected?.({
              id: wallet.id,
              subId: subWallet?.subWallet.id
            })
          }}
          onDoubleClick={() => {
            if (isWalletGroup(wallet.type)) {
              onToggleOpen?.(wallet.id)
            }
          }}
          data-group>
          <HStack spacing={4}>
            <AccountAvatar text={wallet.hash} />
            <Box w="200px">
              <Text fontSize="lg" noOfLines={1}>
                {wallet.name}
              </Text>
              {typeIdentifier && (
                <Text mt="-4px" mb="-7px">
                  <TypeBadge
                    identifier={typeIdentifier.identifier}
                    logo={typeIdentifier.logo}
                  />
                </Text>
              )}
            </Box>
          </HStack>

          <HStack
            spacing={4}
            visibility={infoVisibility || 'hidden'}
            _groupHover={{ visibility: infoVisibility || 'visible' }}>
            <Stack fontSize="sm" color="gray.500" spacing={1}>
              {account && (
                <Text
                  sx={{ fontFeatureSettings: '"tnum"' }}
                  fontSize="sm"
                  color="gray.500">
                  {shortenAddress(account.address)}
                </Text>
              )}

              {isWalletGroup(wallet.type) && (
                <Text>{subWallets.length} accounts</Text>
              )}

              <Text>Created At: {dayjs(wallet.createdAt).fromNow()}</Text>
            </Stack>

            <Box {...dragHandleProps} p={2}>
              <Icon as={MdDragIndicator} fontSize="xl" />
            </Box>
          </HStack>
        </HStack>
      </Box>

      {isOpen && isWalletGroup(wallet.type) && (
        <SubWalletList
          subWallets={subWallets}
          onSelectedId={(selected) => onSelected?.(selected)}
          measure={measure}
        />
      )}
    </Box>
  )
}
