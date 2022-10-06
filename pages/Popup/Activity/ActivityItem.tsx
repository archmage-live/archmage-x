import {
  Button,
  Center,
  HStack,
  Icon,
  Stack,
  Text,
  Tooltip
} from '@chakra-ui/react'
import Decimal from 'decimal.js'
import { GrDeploy } from 'react-icons/gr'
import { IoIosSend } from 'react-icons/io'
import { MdAutoFixHigh, MdCallReceived } from 'react-icons/md'

import { dayjs } from '~lib/dayjs'
import { formatNumber } from '~lib/formatNumber'
import { INetwork, IPendingTx, ITransaction } from '~lib/schema'
import { getNetworkInfo } from '~lib/services/network'
import { TransactionType, getTransactionInfo } from '~lib/services/transaction'
import { shortenAddress } from '~lib/utils'

import { Status } from './ActivityDetail/evm'

export const ActivityItem = ({
  network,
  tx,
  onClick,
  onSpeedUp
}: {
  network: INetwork
  tx: IPendingTx | ITransaction
  onClick: () => void
  onSpeedUp: (isSpeedUp: boolean) => void
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
      icon = MdAutoFixHigh
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
      as="div"
      cursor="pointer"
      size="lg"
      w="full"
      h={!txInfo.isPending ? '63px' : '105px'}
      px={4}
      justifyContent="start"
      variant="solid-secondary"
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
          <Stack align="start" maxW="65%" spacing={4}>
            <Stack>
              <Text
                fontWeight="medium"
                noOfLines={1}
                display="block"
                maxW="full">
                {txInfo.name}
              </Text>

              <HStack fontSize="sm" color="gray.500">
                {txInfo.isPending ? (
                  <Status status={txInfo.status} />
                ) : (
                  <Tooltip label={dayjs(txInfo.timestamp).toString()}>
                    <Text>{dayjs(txInfo.timestamp).fromNow()}</Text>
                  </Tooltip>
                )}
                <Text>
                  {txInfo.origin || (txInfo.to && shortenAddress(txInfo.to))}
                </Text>
              </HStack>
            </Stack>

            {txInfo.isPending && (
              <HStack onClick={(e) => e.stopPropagation()}>
                <Button
                  size="xs"
                  colorScheme="purple"
                  onClick={() => onSpeedUp(true)}>
                  {!txInfo.isCancelled ? 'Speed Up' : 'Speed Up Cancellation'}
                </Button>
                {!txInfo.isCancelled && (
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => onSpeedUp(false)}>
                    Cancel
                  </Button>
                )}
              </HStack>
            )}
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
