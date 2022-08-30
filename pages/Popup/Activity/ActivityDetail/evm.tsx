import {
  CheckCircleIcon,
  CopyIcon,
  ExternalLinkIcon,
  TimeIcon,
  WarningIcon
} from '@chakra-ui/icons'
import {
  Divider,
  HStack,
  IconButton,
  Stack,
  Text,
  Tooltip,
  useClipboard
} from '@chakra-ui/react'
import { TransactionReceipt } from '@ethersproject/abstract-provider'
import { BigNumber } from '@ethersproject/bignumber'
import Decimal from 'decimal.js'
import { ethers } from 'ethers'
import { useEffect, useMemo, useState } from 'react'
import browser from 'webextension-polyfill'

import { useTransparentize } from '~hooks/useColor'
import { formatNumber } from '~lib/formatNumber'
import { EvmChainInfo } from '~lib/network/evm'
import { INetwork, ITransaction } from '~lib/schema'
import { getNetworkInfo } from '~lib/services/network'
import { EvmProvider } from '~lib/services/provider/evm'
import {
  TransactionStatus,
  getTransactionInfo
} from '~lib/services/transaction'
import { EvmTransactionInfo } from '~lib/services/transaction/evm'
import { shortenAddress } from '~lib/utils'
import { FromTo } from '~pages/Popup/Consent/Transaction/FromTo'

const Status = ({ status }: { status: TransactionStatus }) => {
  let bgColor, color, Icon, text
  switch (status) {
    case TransactionStatus.PENDING:
      bgColor = 'orange.300'
      color = 'orange.500'
      Icon = TimeIcon
      text = 'Pending'
      break
    case TransactionStatus.CONFIRMED:
      bgColor = 'green.300'
      color = 'green.500'
      Icon = CheckCircleIcon
      text = 'Success'
      break
    case TransactionStatus.CONFIRMED_FAILURE:
      bgColor = 'red.300'
      color = 'red.500'
      Icon = WarningIcon
      text = 'Failed'
      break
  }

  const bg = useTransparentize(bgColor, bgColor, 0.1)

  return (
    <HStack py="1" px="2" borderRadius="8px" color={color} bg={bg}>
      <Icon />
      <Text fontSize="sm">{text}</Text>
    </HStack>
  )
}

export const EvmActivityDetail = ({
  network,
  tx
}: {
  network: INetwork
  tx: ITransaction
}) => {
  const netInfo = getNetworkInfo(network)

  const txInfo = getTransactionInfo(tx)

  const info = tx.info as EvmTransactionInfo

  const [receipt, setReceipt] =
    useState<Omit<TransactionReceipt, 'confirmations'>>()
  const [baseFeePerGas, setBaseFeePerGas] = useState<BigNumber | null>()
  useEffect(() => {
    const effect = async () => {
      const provider = await EvmProvider.from(network)
      if (info.receipt) {
        setReceipt(info.receipt)
      } else {
        const receipt = await provider.getTransactionReceipt(info.tx.hash)
        setReceipt(receipt)
      }
      if (typeof info.tx.blockNumber === 'number') {
        const block = await provider.getBlock(info.tx.blockNumber)
        setBaseFeePerGas(block.baseFeePerGas)
      }
    }
    effect()
  }, [network, info])

  const amount = new Decimal(txInfo.amount).div(
    new Decimal(10).pow(netInfo.decimals)
  )

  const fee = receipt
    ? new Decimal(
        receipt.effectiveGasPrice.mul(receipt.gasUsed).toString()
      ).div(new Decimal(10).pow(netInfo.decimals))
    : 0

  const total = amount.add(fee)

  const priorityFeePerGas =
    receipt && baseFeePerGas ? receipt.effectiveGasPrice.sub(baseFeePerGas) : 0

  const { hasCopied, onCopy } = useClipboard(info.tx.hash)

  const txUrl = useMemo(() => {
    const netInfo = network.info as EvmChainInfo
    if (!netInfo.explorers.length) {
      return undefined
    }
    try {
      const url = new URL(netInfo.explorers[0].url)
      url.pathname = `/tx/${info.tx.hash}`
      return url.toString()
    } catch {
      return undefined
    }
  }, [network, info])

  return (
    <Stack w="full" spacing={4} pt={8}>
      <HStack justify="space-between">
        <Text>Tx Hash</Text>
        <HStack fontSize="sm" color="gray.500" spacing={1}>
          <Text>{shortenAddress(info.tx.hash, { prefixChars: 4 })}</Text>
          <Tooltip
            label={!hasCopied ? 'Copy Tx Hash' : 'Copied'}
            placement="top">
            <IconButton
              variant="ghost"
              aria-label="Copy Tx Hash"
              size="xs"
              icon={<CopyIcon />}
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
                  browser.tabs.create({ url: txUrl })
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
        <Text>From</Text>
        <Text>To</Text>
      </HStack>

      <FromTo from={info.tx.from} to={info.tx.to!} />

      <Divider />

      <HStack justify="space-between">
        <Text>Nonce</Text>
        <Text>{info.tx.nonce}</Text>
      </HStack>

      <HStack justify="space-between">
        <Text>Amount</Text>
        <Text fontWeight="medium">
          {formatNumber(amount.toString(), undefined, 9)}
          &nbsp;
          {netInfo.currencySymbol}
        </Text>
      </HStack>

      <HStack justify="space-between">
        <Text>Gas Limit (Units)</Text>
        <Text>{info.tx.gasLimit.toNumber()}</Text>
      </HStack>

      {receipt && (
        <HStack justify="space-between">
          <Text>Gas Used (Units)</Text>
          <Text>{receipt.gasUsed.toNumber()}</Text>
        </HStack>
      )}

      {receipt && (
        <HStack justify="space-between">
          <Text>Gas Price (Gwei)</Text>
          <Text>
            {ethers.utils.formatUnits(receipt.effectiveGasPrice, 'gwei')}
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

      <HStack justify="space-between">
        <Text>Gas Fee</Text>
        <Text>
          {formatNumber(fee.toString(), undefined, 9)}
          &nbsp;
          {netInfo.currencySymbol}
        </Text>
      </HStack>

      <HStack justify="space-between">
        <Text>Total</Text>
        <Text fontWeight="medium">
          {formatNumber(total.toString(), undefined, 9)}
          &nbsp;
          {netInfo.currencySymbol}
        </Text>
      </HStack>
    </Stack>
  )
}
