import {
  Box,
  Button,
  Center,
  HStack,
  Icon,
  Stack,
  Text
} from '@chakra-ui/react'
import Decimal from 'decimal.js'
import { GrDeploy } from 'react-icons/gr'
import { IoIosSend } from 'react-icons/io'
import { MdCallReceived, MdSwapHoriz } from 'react-icons/md'

import { dayjs } from '~lib/dayjs'
import { formatNumber } from '~lib/formatNumber'
import { INetwork, ITransaction } from '~lib/schema'
import { getNetworkInfo } from '~lib/services/network'
import { TransactionType, getTransactionInfo } from '~lib/services/transaction'
import { shortenAddress } from '~lib/utils'

export const ActivityItem = ({
  network,
  tx,
  onClick
}: {
  network: INetwork
  tx: ITransaction
  onClick: () => void
}) => {
  const netInfo = getNetworkInfo(network)

  const txInfo = getTransactionInfo(tx)

  let icon
  switch (txInfo.type) {
    case TransactionType.Send:
      icon = IoIosSend
      break
    case TransactionType.Receive:
      icon = MdCallReceived
      break
    case TransactionType.CallContract:
      icon = MdSwapHoriz
      break
    case TransactionType.DeployContract:
      icon = GrDeploy
      break
  }

  const amount = new Decimal(txInfo.amount).div(
    new Decimal(10).pow(netInfo.decimals)
  )

  return (
    <Button
      size="lg"
      w="full"
      h="63px"
      px={4}
      justifyContent="start"
      onClick={onClick}>
      <HStack w="full" justify="space-between" fontWeight="normal">
        <Center
          w={8}
          h={8}
          borderRadius="full"
          borderWidth="1px"
          borderColor="purple.500">
          <Icon as={icon} fontSize="lg" color="purple.500" />
        </Center>

        <HStack w="calc(100% - 42px)" justify="space-between" align="start">
          <Stack align="start">
            <Text fontWeight="medium">{txInfo.name}</Text>
            <HStack fontSize="sm" color="gray.500">
              <Text>{dayjs(txInfo.timestamp).fromNow()}</Text>
              <Text>
                {txInfo.origin || (txInfo.to && shortenAddress(txInfo.to))}
              </Text>
            </HStack>
          </Stack>

          <Stack>
            <Text fontWeight="medium" fontSize="md">
              {amount.gt(0) ? '-' : ''}
              &nbsp;
              {formatNumber(amount.toString())}
              &nbsp;
              {netInfo.currencySymbol}
            </Text>
          </Stack>
        </HStack>
      </HStack>
    </Button>
  )
}
