import { CheckIcon } from '@chakra-ui/icons'
import { Box, Button, Checkbox, HStack, Text } from '@chakra-ui/react'

import { AccountAvatar } from '~components/AccountAvatar'
import { formatNumber } from '~lib/formatNumber'
import { INetwork } from '~lib/schema'
import { useBalance } from '~lib/services/provider'
import { SubWalletEntry } from '~lib/services/wallet/tree'
import { shortenAddress } from '~lib/utils'

export const SubWalletItem = ({
  network,
  subWallet,
  onChecked
}: {
  network: INetwork
  subWallet: SubWalletEntry
  onChecked: (checked: boolean) => void
}) => {
  const { subWallet: wallet, account, isChecked } = subWallet
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
        onChecked(!isChecked)
      }}>
      <Box w="full">
        <HStack w="full" justify="space-between">
          <Checkbox mb="-12px" isChecked={isChecked} pointerEvents="none" />
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

              <Text
                sx={{ fontFeatureSettings: '"tnum"' }}
                fontSize="sm"
                color="gray.500">
                {shortenAddress(account.address)}
              </Text>
            </HStack>
          </HStack>

          {subWallet.isSelected && (
            <CheckIcon fontSize="lg" color="green.500" />
          )}
        </HStack>

        <HStack w="calc(100% - 29.75px)" justify="space-between">
          <Text ps={'62px'} fontSize="xs" color="gray.500" textAlign="start">
            {formatNumber(balance?.amount)} {balance?.symbol}
          </Text>

          <Box onClick={(event) => event.stopPropagation()}></Box>
        </HStack>
      </Box>
    </Button>
  )
}
