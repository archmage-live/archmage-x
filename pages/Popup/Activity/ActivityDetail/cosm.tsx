import { ExternalLinkIcon } from '@chakra-ui/icons'
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
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
import { useMemo } from 'react'
import browser from 'webextension-polyfill'

import { dayjs } from '~lib/dayjs'
import { formatNumber } from '~lib/formatNumber'
import { CosmAppChainInfo } from '~lib/network/cosm'
import { pubkeyToAddress } from '~lib/network/cosm/amino'
import { decodePubkey } from '~lib/network/cosm/proto-signing'
import { IChainAccount, INetwork, IPendingTx, ITransaction } from '~lib/schema'
import {
  useCosmTokenInfo,
  useCosmTokenInfos
} from '~lib/services/datasource/cosmostation'
import { getNetworkInfo, getTransactionUrl } from '~lib/services/network'
import { getTokenBrief, useToken } from '~lib/services/token'
import { getTransactionInfo } from '~lib/services/transaction'
import { parseCosmTx } from '~lib/services/transaction/cosmParse'
import {
  CosmPendingTxInfo,
  CosmTransactionInfo,
  isCosmPendingTxInfo
} from '~lib/services/transaction/cosmService'
import { shortenString } from '~lib/utils'

import { Status } from './evm'

export const CosmActivityDetail = ({
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

  const info = tx.info as CosmPendingTxInfo | CosmTransactionInfo

  const isPending = isCosmPendingTxInfo(info)

  const txResponse = !isPending
    ? (info as CosmTransactionInfo).txResponse
    : undefined

  const { hasCopied, onCopy } = useClipboard(txInfo.hash)

  const txUrl = getTransactionUrl(network, txInfo.hash)

  const signer = useMemo(() => {
    const publicKey = info.tx.authInfo?.signerInfos[0]?.publicKey
    return (
      publicKey &&
      pubkeyToAddress(
        decodePubkey(publicKey)!,
        (network.info as CosmAppChainInfo).bech32Config.bech32PrefixAccAddr
      )
    )
  }, [network, info])

  const feeToken = useCosmTokenInfo(
    network.info,
    info.tx.authInfo?.fee?.amount[0]?.denom
  )

  const tokenInfos = useCosmTokenInfos(network.info)

  const msgs = useMemo(() => {
    const { msgs } = parseCosmTx(
      info.tx,
      txResponse,
      network.info,
      account.address!,
      tokenInfos
    )
    return msgs
  }, [network, account, info, txResponse, tokenInfos])

  return (
    <Stack w="full" spacing={4} pt={8}>
      <HStack justify="space-between">
        <Text>Tx Hash</Text>
        <HStack fontSize="sm" color="gray.500" spacing={1}>
          <Text>
            {shortenString(txInfo.hash, {
              prefixChars: 4
            })}
          </Text>
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
            <Tooltip label="View On Explorer" placement="top">
              <IconButton
                variant="ghost"
                aria-label="View On Explorer"
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

      {txResponse && (
        <HStack justify="space-between">
          <Text>Block Height</Text>
          <Text>{txResponse?.height.toString()}</Text>
        </HStack>
      )}

      <Divider />

      <Stack spacing={2}>
        <HStack justify="space-between">
          <Text>Signer</Text>
          <Text>
            {shortenString(signer, {
              prefixChars: 4,
              leadingChars: (network.info as CosmAppChainInfo).bech32Config
                .bech32PrefixAccAddr
            })}
          </Text>
        </HStack>

        <HStack justify="space-between">
          <Text>Sequence</Text>
          <Text>{info.tx.authInfo?.signerInfos[0]?.sequence.toString()}</Text>
        </HStack>

        <HStack justify="space-between">
          <Text>Gas Fee</Text>
          <Text>
            {formatNumber(
              info.tx.authInfo?.fee?.amount[0]?.amount,
              feeToken?.decimals,
              feeToken?.decimals
            )}
            &nbsp;
            {feeToken?.symbol}
          </Text>
        </HStack>

        {txResponse && (
          <HStack justify="space-between">
            <Text>Gas Used</Text>
            <Text>{txResponse.gasUsed.toString()}</Text>
          </HStack>
        )}

        {txResponse && (
          <HStack justify="space-between">
            <Text>Gas Wanted</Text>
            <Text>{info.tx.authInfo?.fee?.gasLimit.toString()}</Text>
          </HStack>
        )}

        <HStack justify="space-between">
          <Text>Memo</Text>
          <Text noOfLines={2} maxW="50%">
            {info.tx.body?.memo}
          </Text>
        </HStack>
      </Stack>

      <Divider />

      <Accordion allowToggle>
        {msgs.map((msg, index) => {
          return (
            <AccordionItem key={index}>
              <h4>
                <AccordionButton>
                  <Box as="span" flex="1" textAlign="left">
                    {index}. {msg.type}
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
              </h4>
              <AccordionPanel pb={4}>
                <Stack>{msg.node}</Stack>
              </AccordionPanel>
            </AccordionItem>
          )
        })}
      </Accordion>
    </Stack>
  )
}
