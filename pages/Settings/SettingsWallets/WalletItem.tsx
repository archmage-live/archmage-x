import { Box, HStack, Icon, Stack, Text } from '@chakra-ui/react'
import { MdDragIndicator } from '@react-icons/all-files/md/MdDragIndicator'
import { useCallback, useEffect, useRef, useState } from 'react'
import { DraggableProvidedDragHandleProps } from 'react-beautiful-dnd'

import { AccountAvatar } from '~components/AccountAvatar'
import { TruncatedText } from '~components/TruncatedText'
import { TypeBadge } from '~components/TypeBadge'
import { dayjs } from '~lib/dayjs'
import { SelectedWalletId, WalletEntry } from '~lib/services/wallet/tree'
import { shortenString } from '~lib/utils'
import { getWalletTypeIdentifier, isWalletGroup } from '~lib/wallet'

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
  measureElement?: (element: HTMLElement | null) => any
  index?: number
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
  measureElement,
  index
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
    <Box ref={elRef} data-index={index}>
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
                <HStack mt="-4px" mb="-7px">
                  <TypeBadge
                    identifier={typeIdentifier.identifier}
                    logo={typeIdentifier.logo}
                    logoLight={typeIdentifier.logoLight}
                    logoDark={typeIdentifier.logoDark}
                    logoLightInvert={typeIdentifier.logoLightInvert}
                    logoDarkInvert={typeIdentifier.logoDarkInvert}
                    logoHeight={typeIdentifier.logoHeight}
                  />
                </HStack>
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
                  {shortenString(account.address)}
                </Text>
              )}

              {isWalletGroup(wallet.type) && (
                <Text>{subWallets.length} accounts</Text>
              )}

              <TruncatedText>
                Created At: {dayjs(wallet.createdAt).fromNow()}
              </TruncatedText>
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
