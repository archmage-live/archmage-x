import { CheckIcon } from '@chakra-ui/icons'
import { Box, Button, Checkbox, HStack, Stack, Text } from '@chakra-ui/react'

import { AccountAvatar } from '~components/AccountAvatar'
import { formatNumber } from '~lib/formatNumber'
import { IChainAccount, INetwork, ISubWallet } from '~lib/schema'
import { useBalance } from '~lib/services/provider'
import { shortenAddress } from '~lib/utils'

export const SubWalletItem = ({
  network,
  wallet,
  account,
  selected,
  onSelected,
  active,
  isChecked,
  onChecked
}: {
  network: INetwork
  wallet: ISubWallet
  account: IChainAccount
  selected?: boolean
  onSelected?: () => void
  active?: boolean
  isChecked?: boolean
  onChecked?: (checked: boolean) => void
}) => {
  const balance = useBalance(network, account)

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
      <Box w="full">
        <HStack w="full" justify="space-between">
          {onChecked !== undefined && (
            <Checkbox mb="-12px" isChecked={isChecked} pointerEvents="none" />
          )}
          <HStack w="calc(100% - 29.75px)" justify="space-between">
            <AccountAvatar
              text={account.address || ''}
              scale={0.8}
              m="-3px"
              mb="-16px"
            />

            <HStack
              w="calc(100% - 31px)"
              justify="space-between"
              align="baseline">
              <Text fontSize="lg" noOfLines={1} display="block">
                {wallet.name}
              </Text>

              <Text fontFamily="monospace" fontSize="sm" color="gray.500">
                {shortenAddress(account.address)}
              </Text>
            </HStack>
          </HStack>

          {active && <CheckIcon fontSize="lg" color="green.500" />}
        </HStack>

        <Text
          ps={onChecked !== undefined ? '62px' : '32px'}
          fontSize="xs"
          color="gray.500"
          textAlign="start">
          {formatNumber(balance?.amount)} {balance?.symbol}
        </Text>
      </Box>
    </Button>
  )
}
