import { Box, Button, HStack, Text } from '@chakra-ui/react'
import { useEffect, useRef } from 'react'

import { AccountAvatar } from '~components/AccountAvatar'
import { useTransparentize } from '~lib/hooks/useColor'
import { IWallet } from '~lib/schema'

export const WalletItem = ({
  wallet,
  isSelected,
  onSelected,
  measureElement
}: {
  wallet: IWallet
  isSelected: boolean
  onSelected: () => void
  measureElement?: (element?: HTMLElement | null) => any
}) => {
  const elRef = useRef(null)

  useEffect(() => {
    measureElement?.(elRef.current)
  }, [measureElement])

  const bg = useTransparentize('purple.300', 'purple.300', 0.1)

  return (
    <Box ref={elRef} py={1}>
      <Box
        borderWidth="1px"
        borderRadius="md"
        borderColor={isSelected ? 'purple.500' : undefined}
        bg={isSelected ? bg : undefined}>
        <WalletItemButton wallet={wallet} onClick={onSelected} />
      </Box>
    </Box>
  )
}

export const WalletItemButton = ({
  wallet,
  onClick
}: {
  wallet: IWallet
  onClick: () => void
}) => {
  return (
    <Button
      key={wallet.id}
      as="div"
      cursor="pointer"
      variant="ghost"
      size="lg"
      w="full"
      h={16}
      px={4}
      justifyContent="start"
      onClick={onClick}>
      <HStack spacing={4}>
        <AccountAvatar text={wallet.hash} />

        <Text fontSize="lg" noOfLines={1} display="block">
          {wallet.name}
        </Text>
      </HStack>
    </Button>
  )
}
