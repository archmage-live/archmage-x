import { CheckIcon } from '@chakra-ui/icons'
import { Box, Button, Checkbox, HStack, Text } from '@chakra-ui/react'
import Blockies from 'react-blockies'

import { IDerivedWallet, IWalletInfo } from '~lib/schema'
import { shortenAddress } from '~lib/utils'

export const SubWalletItem = ({
  wallet,
  info,
  selected,
  onSelected,
  active,
  isChecked,
  onChecked
}: {
  wallet: IDerivedWallet
  info?: IWalletInfo
  selected?: boolean
  onSelected?: () => void
  active?: boolean
  isChecked?: boolean
  onChecked?: (checked: boolean) => void
}) => {
  return (
    <Button
      key={wallet.id}
      variant="ghost"
      size="lg"
      w="full"
      h={16}
      px={4}
      justifyContent="start"
      onClick={() => {
        onSelected?.()
        onChecked?.(!isChecked)
      }}>
      <HStack w="full" justify="space-between">
        {onChecked !== undefined && (
          <Checkbox isChecked={isChecked} pointerEvents="none" />
        )}
        <HStack w="calc(100% - 29.75px)" justify="space-between">
          <Box
            borderRadius="50%"
            overflow="hidden"
            transform="scale(0.8)"
            m="-3px">
            <Blockies seed={info?.address + ''} size={10} scale={3} />
          </Box>

          <HStack
            w="calc(100% - 31px)"
            justify="space-between"
            align="baseline">
            <Text fontSize="lg" noOfLines={1} display="block">
              {wallet.name}
            </Text>

            <Text fontSize="sm" color="gray.500">
              {shortenAddress(info?.address, 4)}
            </Text>
          </HStack>
        </HStack>

        {active && <CheckIcon fontSize="lg" color="green.500" />}
      </HStack>
    </Button>
  )
}
