import {
  Button,
  Center,
  HStack,
  Icon,
  Stack,
  Text,
  Tooltip
} from '@chakra-ui/react'
import { IoIosSend } from '@react-icons/all-files/io/IoIosSend'
import { MdAutoFixHigh } from '@react-icons/all-files/md/MdAutoFixHigh'
import { MdCallReceived } from '@react-icons/all-files/md/MdCallReceived'
import { MdOutlineRocketLaunch } from '@react-icons/all-files/md/MdOutlineRocketLaunch'
import Decimal from 'decimal.js'

import { dayjs } from '~lib/dayjs'
import { formatNumber } from '~lib/formatNumber'
import { INetwork, IPendingTx, ITransaction } from '~lib/schema'
import { getNetworkInfo } from '~lib/services/network'
import { TransactionType, getTransactionInfo } from '~lib/services/transaction'
import { shortenString } from '~lib/utils'

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

  const txInfo = getTransactionInfo(tx, network)

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
      icon = MdOutlineRocketLaunch
      break
  }

  const amount = txInfo.amount
    ? new Decimal(txInfo.amount).div(new Decimal(10).pow(netInfo.decimals))
    : undefined

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
      fontSize="md"
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
            <Stack maxW="full">
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
                  {txInfo.origin || (txInfo.to && shortenString(txInfo.to))}
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
            {amount && (
              <Text fontWeight="medium" fontSize="md">
                {txInfo.type === TransactionType.Receive ? '+' : '-'}
                &nbsp;
                {formatNumber(amount.toString())}
                &nbsp;
                {netInfo.currencySymbol}
              </Text>
            )}
          </Stack>
        </HStack>
      </HStack>
    </Button>
  )
}
