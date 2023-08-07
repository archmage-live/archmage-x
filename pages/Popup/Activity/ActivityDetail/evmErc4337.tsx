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
import { BigNumber } from '@ethersproject/bignumber'
import { FiCheckCircle } from '@react-icons/all-files/fi/FiCheckCircle'
import { FiCopy } from '@react-icons/all-files/fi/FiCopy'
import Decimal from 'decimal.js'
import { ethers } from 'ethers'
import { useMemo, useState } from 'react'
import { useAsync } from 'react-use'
import browser from 'webextension-polyfill'

import { dayjs } from '~lib/dayjs'
import { formatNumber } from '~lib/formatNumber'
import { INetwork, IPendingTx, ITransaction } from '~lib/schema'
import {
  getErc4337TransactionUrl,
  getNetworkInfo,
  getTransactionUrl
} from '~lib/services/network'
import {
  EvmErc4337Client,
  UserOperationReceipt,
  UserOperationResponse
} from '~lib/services/provider/evm'
import { getTransactionInfo } from '~lib/services/transaction'
import { EvmTransactionInfo } from '~lib/services/transaction/evmService'
import { shortenString } from '~lib/utils'
import { FromTo } from '~pages/Popup/Consent/Transaction/FromTo'

import { Status } from './evm'

export const EvmErc4337ActivityDetail = ({
  network,
  tx
}: {
  network: INetwork
  tx: IPendingTx | ITransaction
}) => {
  const netInfo = getNetworkInfo(network)

  const txInfo = getTransactionInfo(tx)

  const info = tx.info as Omit<EvmTransactionInfo, 'tx'> & {
    tx: UserOperationResponse
  }

  const [receipt, setReceipt] = useState<UserOperationReceipt>()
  const [baseFeePerGas, setBaseFeePerGas] = useState<BigNumber | null>()

  useAsync(async () => {
    const provider = await EvmErc4337Client.fromMayUndefined(network)
    if (!provider) {
      return
    }
    let receipt
    if (info.receipt) {
      receipt = info.receipt as UserOperationReceipt
    } else {
      receipt = await provider.getTransactionReceipt(info.tx.hash)
    }
    setReceipt(receipt)

    const block = await provider.getBlock(
      BigNumber.from(receipt.receipt.blockNumber).toNumber()
    )
    setBaseFeePerGas(block.baseFeePerGas)
  }, [network, info])

  const priorityFeePerGas = useMemo(
    () =>
      receipt && baseFeePerGas
        ? BigNumber.from(receipt.receipt.effectiveGasPrice).sub(baseFeePerGas)
        : 0,
    [baseFeePerGas, receipt]
  )

  const userOpHash = info.tx.hash
  const userOpUrl = getErc4337TransactionUrl(network, userOpHash)

  const txHash = info.tx.transactionHash || receipt?.receipt.transactionHash
  const txUrl = txHash && getTransactionUrl(network, txHash)

  const { hasCopied: hasUserOpHashCopied, onCopy: onUserOpHashCopy } =
    useClipboard(userOpHash)
  const { hasCopied: hasTxHashCopied, onCopy: onTxHashCopy } = useClipboard(
    txHash || ''
  )

  return (
    <Stack w="full" spacing={4} pt={8}>
      <HStack justify="space-between">
        <Text>User Operation Hash</Text>
        <HStack fontSize="sm" color="gray.500" spacing={1}>
          <Text>{shortenString(userOpHash, { prefixChars: 4 })}</Text>
          <Tooltip
            label={!hasUserOpHashCopied ? 'Copy User Operation Hash' : 'Copied'}
            placement="top"
            closeOnClick={false}>
            <IconButton
              variant="ghost"
              aria-label="Copy User Operation Hash"
              size="xs"
              icon={<Icon as={!hasUserOpHashCopied ? FiCopy : FiCheckCircle} />}
              onClick={onUserOpHashCopy}
            />
          </Tooltip>
          {userOpUrl && (
            <Tooltip label="View On JiffyScan" placement="top">
              <IconButton
                variant="ghost"
                aria-label="View On JiffyScan"
                size="xs"
                icon={<ExternalLinkIcon />}
                onClick={() => {
                  browser.tabs.create({ url: userOpUrl }).finally()
                }}
              />
            </Tooltip>
          )}
        </HStack>
      </HStack>

      <HStack justify="space-between">
        <Text>Tx Hash</Text>
        <HStack fontSize="sm" color="gray.500" spacing={1}>
          <Text>{shortenString(txHash, { prefixChars: 4 })}</Text>
          <Tooltip
            label={!hasTxHashCopied ? 'Copy Tx Hash' : 'Copied'}
            placement="top"
            closeOnClick={false}>
            <IconButton
              variant="ghost"
              aria-label="Copy Tx Hash"
              size="xs"
              icon={<Icon as={!hasTxHashCopied ? FiCopy : FiCheckCircle} />}
              onClick={onTxHashCopy}
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
        <Text>From</Text>
        <Text>To</Text>
      </HStack>

      <FromTo from={txInfo.from} to={txInfo.to} />

      <Divider />

      <Stack spacing={2}>
        <HStack justify="space-between">
          <Text>Nonce</Text>
          <Text>{+info.tx.nonce}</Text>
        </HStack>

        <HStack justify="space-between">
          <Text>Gas Limit (Units)</Text>
          <Text>
            {+info.tx.callGasLimit +
              +info.tx.verificationGasLimit +
              +info.tx.preVerificationGas}
          </Text>
        </HStack>

        {receipt && (
          <HStack justify="space-between">
            <Text>Gas Used (Units)</Text>
            <Text>{BigNumber.from(receipt.actualGasUsed).toNumber()}</Text>
          </HStack>
        )}

        {receipt && (
          <HStack justify="space-between">
            <Text>Gas Price (Gwei)</Text>
            <Text>
              {ethers.utils.formatUnits(
                receipt.receipt.effectiveGasPrice,
                'gwei'
              )}
            </Text>
          </HStack>
        )}

        {receipt && baseFeePerGas && (
          <HStack justify="space-between">
            <Text>Base Fee (Gwei)</Text>
            <Text>{ethers.utils.formatUnits(baseFeePerGas, 'gwei')}</Text>
          </HStack>
        )}

        {receipt && baseFeePerGas && (
          <HStack justify="space-between">
            <Text>Priority Fee (Gwei)</Text>
            <Text>{ethers.utils.formatUnits(priorityFeePerGas, 'gwei')}</Text>
          </HStack>
        )}

        {receipt && (
          <HStack justify="space-between">
            <Text>Gas Fee</Text>
            <Text>
              {formatNumber(
                new Decimal(
                  BigNumber.from(receipt.actualGasCost).toNumber()
                ).div(new Decimal(10).pow(netInfo.decimals)),
                undefined,
                9
              )}
              &nbsp;
              {netInfo.currencySymbol}
            </Text>
          </HStack>
        )}
      </Stack>

      <Divider />

      <Stack spacing={2}>
        {receipt && (
          <HStack justify="space-between">
            <Text>Paymaster</Text>
            <Text>{shortenString(receipt.paymaster)}</Text>
          </HStack>
        )}

        {receipt && (
          <HStack justify="space-between">
            <Text>Entry Point</Text>
            <Text>{shortenString(receipt.entryPoint)}</Text>
          </HStack>
        )}
      </Stack>
    </Stack>
  )
}
