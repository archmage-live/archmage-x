import { ExternalLinkIcon } from '@chakra-ui/icons'
import {
  Divider,
  HStack,
  Icon,
  IconButton,
  Stack,
  Text,
  Tooltip,
  useClipboard
} from '@chakra-ui/react'
import { FiCheckCircle } from '@react-icons/all-files/fi/FiCheckCircle'
import { FiCopy } from '@react-icons/all-files/fi/FiCopy'
import { Types } from 'aptos'
import Decimal from 'decimal.js'
import { useMemo } from 'react'
import browser from 'webextension-polyfill'

import { FromTo } from '~components/FromTo'
import { dayjs } from '~lib/dayjs'
import { formatNumber } from '~lib/formatNumber'
import { IChainAccount, INetwork, IPendingTx, ITransaction } from '~lib/schema'
import { getNetworkInfo, getTransactionUrl } from '~lib/services/network'
import { getTransactionInfo } from '~lib/services/transaction'
import { parseAptosTxInfo } from '~lib/services/transaction/aptosParse'
import {
  AptosPendingTxInfo,
  AptosTransactionInfo,
  isAptosPendingTransaction
} from '~lib/services/transaction/aptosService'
import { shortenString } from '~lib/utils'

import { Status } from './evm'

export const AptosActivityDetail = ({
  network,
  account,
  tx
}: {
  network: INetwork
  account: IChainAccount
  tx: IPendingTx | ITransaction
}) => {
  const netInfo = getNetworkInfo(network)

  const txInfo = getTransactionInfo(tx)

  const info = tx.info as AptosPendingTxInfo | AptosTransactionInfo

  const isPending = isAptosPendingTransaction(info.tx)

  const userTx: Types.Transaction_UserTransaction | undefined = isPending
    ? (info as AptosPendingTxInfo).simulatedTx
    : (info.tx as Types.Transaction_UserTransaction)

  const aptosTxInfo = parseAptosTxInfo(
    account.address!,
    (info as AptosPendingTxInfo).simulatedTx || info.tx
  )

  const { hasCopied, onCopy } = useClipboard(info.tx.hash)

  const txUrl = getTransactionUrl(network, info.tx.hash)

  const [amount, fee, total, gasPrice] = useMemo(() => {
    const amount = txInfo.amount
      ? new Decimal(txInfo.amount).div(new Decimal(10).pow(netInfo.decimals))
      : undefined

    const fee = userTx
      ? new Decimal(info.tx.gas_unit_price)
          .mul(userTx.gas_used)
          .div(new Decimal(10).pow(netInfo.decimals))
      : undefined

    const total = amount && fee ? amount.add(fee) : undefined

    const gasPrice = new Decimal(info.tx.gas_unit_price).div(
      new Decimal(10).pow(netInfo.decimals)
    )

    return [amount, fee, total, gasPrice]
  }, [netInfo, txInfo, info, userTx])

  return (
    <Stack w="full" spacing={4} pt={8}>
      <HStack justify="space-between">
        <Text>Tx Hash</Text>
        <HStack fontSize="sm" color="gray.500" spacing={1}>
          <Text>{shortenString(info.tx.hash, { prefixChars: 4 })}</Text>
          <Tooltip
            label={!hasCopied ? 'Copy Tx Hash' : 'Copied'}
            placement="top"
            closeOnClick={false}>
            <IconButton
              variant="ghost"
              aria-label="Copy Tx Hash"
              size="xs"
              icon={<Icon as={!hasCopied ? FiCopy : FiCheckCircle} />}
              onClick={onCopy}
            />
          </Tooltip>
          {txUrl && (
            <Tooltip label="View On Block Explorer" placement="top">
              <IconButton
                variant="ghost"
                aria-label="View On Block Explorer"
                size="xs"
                icon={<ExternalLinkIcon />}
                onClick={() => {
                  browser.tabs.create({ url: txUrl }).finally()
                }}
              />
            </Tooltip>
          )}
        </HStack>
      </HStack>

      {!isPending && userTx && (
        <HStack justify="space-between">
          <Text>Version</Text>
          <Text>{userTx.version}</Text>
        </HStack>
      )}

      <HStack justify="space-between">
        <Text>Status</Text>
        <Status status={txInfo.status} />
      </HStack>

      <HStack justify="space-between">
        <Text>Timestamp</Text>
        <Stack align="end" fontSize="sm">
          <Text>{dayjs(txInfo.timestamp).fromNow()}</Text>
          <Text>{dayjs(txInfo.timestamp).toString()}</Text>
        </Stack>
      </HStack>

      <HStack justify="space-between">
        <Text>Expiration Time</Text>
        <Stack align="end" fontSize="sm">
          <Text>
            {dayjs(Number(info.tx.expiration_timestamp_secs) * 1000).toString()}
          </Text>
        </Stack>
      </HStack>

      <HStack justify="space-between">
        <Text>From</Text>
        <Text>To</Text>
      </HStack>

      <FromTo from={info.tx.sender} to={txInfo.to} />

      <Divider />

      <Stack spacing={2}>
        <HStack justify="space-between">
          <Text>Sequence Number</Text>
          <Text>{txInfo.nonce}</Text>
        </HStack>

        {amount && (
          <HStack justify="space-between">
            <Text>Amount</Text>
            <Text fontWeight="medium">
              {formatNumber(amount, undefined, 8)}
              &nbsp;
              {netInfo.currencySymbol}
            </Text>
          </HStack>
        )}

        <HStack justify="space-between">
          <Text>Max Gas Limit (Units)</Text>
          <Text>{info.tx.max_gas_amount}</Text>
        </HStack>

        {userTx && (
          <HStack justify="space-between">
            <Text>Gas Used (Units)</Text>
            <Text>{userTx.gas_used}</Text>
          </HStack>
        )}

        <HStack justify="space-between">
          <Text>Gas Unit Price</Text>
          <Text>
            {formatNumber(gasPrice, undefined, 8)}
            &nbsp;
            {netInfo.currencySymbol}
          </Text>
        </HStack>

        {fee && (
          <HStack justify="space-between">
            <Text>Gas Fee</Text>
            <Text>
              {formatNumber(fee, undefined, 8)}
              &nbsp;
              {netInfo.currencySymbol}
            </Text>
          </HStack>
        )}

        {total && (
          <HStack justify="space-between">
            <Text>Total</Text>
            <Text fontWeight="medium">
              {formatNumber(total, undefined, 8)}
              &nbsp;
              {netInfo.currencySymbol}
            </Text>
          </HStack>
        )}
      </Stack>
    </Stack>
  )
}
