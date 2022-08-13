import { Box, Button, HStack, Text } from '@chakra-ui/react'
import Blockies from 'react-blockies'

import { IDerivedWallet, IWalletInfo } from '~lib/schema'
import { shortenAddress } from '~lib/utils'

export const SubWalletItem = ({
  wallet,
  info,
  selected,
  onSelected
}: {
  wallet: IDerivedWallet
  info?: IWalletInfo
  selected?: boolean
  onSelected?: () => void
}) => {
  return (
    <Button
      key={wallet.id}
      variant="ghost"
      w="full"
      justifyContent="start"
      isActive={selected}
      onClick={onSelected}>
      <HStack spacing={4}>
        <Box borderRadius="50%" overflow="hidden">
          <Blockies seed={info?.address + ''} size={10} scale={3} />
        </Box>
        <Text fontSize="lg" noOfLines={1}>
          {wallet.name}
        </Text>
        <Text fontSize="lg" color="gray.500" noOfLines={1}>
          {shortenAddress(info?.address)}
        </Text>
      </HStack>
    </Button>
  )
}
