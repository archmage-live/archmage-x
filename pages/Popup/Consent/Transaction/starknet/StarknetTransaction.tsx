import {
  Box,
  Button,
  Center,
  Divider,
  HStack,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  chakra,
  useColorModeValue
} from '@chakra-ui/react'
import assert from 'assert'
import Decimal from 'decimal.js'
import * as React from 'react'
import { ReactNode, useCallback, useMemo, useState } from 'react'
import { TransactionType } from 'starknet'

import { AlertBox } from '~components/AlertBox'
import { SpinningOverlay } from '~components/SpinningOverlay'
import { TextLink } from '~components/TextLink'
import { IChainAccount, INetwork, ISubWallet, IWallet } from '~lib/schema'
import { CONSENT_SERVICE, ConsentRequest } from '~lib/services/consentService'
import { useCryptoComparePrice } from '~lib/services/datasource/cryptocompare'
import { NetworkInfo, getAccountUrl } from '~lib/services/network'
import { useEstimateGasFee } from '~lib/services/provider'
import { useStarknetTransaction } from '~lib/services/provider/starknet/hooks'
import {
  SignType,
  StarknetTransactionPayload
} from '~lib/services/provider/starknet/types'
import { Amount } from '~lib/services/token'
import {
  useStarknetTokenTransfers,
  useStarknetTxEvents
} from '~lib/services/transaction/starknet/events'
import { FromToWithCheck } from '~pages/Popup/Consent/Transaction/FromTo'
import { useTabsHeaderScroll } from '~pages/Popup/Consent/Transaction/helpers'

import { StarknetTxPayload } from './StarknetTransactionData'

export const StarknetTransaction = ({
  origin,
  request,
  network,
  networkInfo,
  wallet,
  subWallet,
  account,
  balance,
  suffix,
  onComplete
}: {
  origin?: string
  request: ConsentRequest
  network: INetwork
  networkInfo: NetworkInfo
  wallet: IWallet
  subWallet: ISubWallet
  account: IChainAccount
  balance?: Amount
  suffix?: ReactNode
  onComplete: () => void
}) => {
  const { txParams, populatedParams } =
    request.payload as StarknetTransactionPayload

  const [payload, to, nonce, maxFee] = useMemo(() => {
    switch (txParams.type) {
      case TransactionType.INVOKE:
        assert(populatedParams.type === TransactionType.INVOKE)
        return [
          txParams.payload,
          txParams.payload.length === 1
            ? txParams.payload[0].contractAddress
            : undefined,
          populatedParams.details.nonce,
          populatedParams.details.maxFee
        ]
      case SignType.INVOKE:
        return [
          txParams.details[0],
          txParams.details[0].length === 1
            ? txParams.details[0][0].contractAddress
            : undefined,
          txParams.details[1].nonce,
          txParams.details[1].maxFee
        ]
      case TransactionType.DEPLOY_ACCOUNT:
        assert(populatedParams.type === TransactionType.DEPLOY_ACCOUNT)
        return [
          txParams.payload,
          undefined,
          populatedParams.details.nonce,
          populatedParams.details.maxFee
        ]
      case SignType.DEPLOY_ACCOUNT:
        return [
          txParams.details,
          undefined,
          txParams.details.nonce,
          txParams.details.maxFee
        ]
      default:
        return []
    }
  }, [txParams, populatedParams])

  const trace = useStarknetTransaction(network, account, request.payload)
  const events = useStarknetTxEvents(
    trace ? trace.function_invocation : undefined
  )
  const [allTokenChanges, transfers] =
    useStarknetTokenTransfers(network, events.transfers) || []
  const tokenChanges = allTokenChanges?.get(account.address!)

  const gasFee = useEstimateGasFee(network, account, txParams)

  const [ignoreEstimateError, setIgnoreEstimateError] = useState(false)

  const price = useCryptoComparePrice(networkInfo.currencySymbol)

  const bg = useColorModeValue('purple.50', 'gray.800')
  const bannerBg = useColorModeValue('white', 'black')

  const { scrollRef, anchorRef, tabsHeaderSx } = useTabsHeaderScroll()

  const [tabIndex, setTabIndex] = useState(0)

  const [spinning, setSpinning] = useState(false)

  const onConfirm = useCallback(async () => {
    setSpinning(true)

    await CONSENT_SERVICE.processRequest(
      {
        ...request,
        payload: request.payload
      },
      true
    )

    onComplete()
    setSpinning(false)
  }, [onComplete, request])

  return (
    <>
      <Stack>
        <Center pt={2} px={6}>
          <Box px={2} py={1} borderRadius="8px" borderWidth="1px">
            <Text noOfLines={1} display="block" fontSize="sm">
              {networkInfo.name}
            </Text>
          </Box>
        </Center>

        <Divider />

        <Box px={6}>
          <FromToWithCheck
            subWallet={subWallet}
            from={account.address!}
            to={to}
          />
        </Box>

        <Divider />
      </Stack>

      <Box ref={scrollRef} overflowY="auto" position="relative" pb={6}>
        <Box w="full" bg={bannerBg}>
          <Stack px={6} py={6} spacing={4}>
            {origin && <Text>{origin}</Text>}

            <HStack minH="30px">
              <HStack
                px={2}
                py={1}
                borderRadius="4px"
                borderWidth="1px"
                maxW="full">
                {txParams.type === TransactionType.INVOKE ||
                txParams.type === SignType.INVOKE ? (
                  <Text fontSize="md" color="gray.500">
                    {'Invoke Contract'.toUpperCase()}
                  </Text>
                ) : txParams.type === TransactionType.DEPLOY_ACCOUNT ||
                  txParams.type === SignType.DEPLOY_ACCOUNT ? (
                  <Text fontSize="md" color="gray.500">
                    {'Deploy Account Contract'.toUpperCase()}
                  </Text>
                ) : (
                  (txParams.type === TransactionType.DECLARE ||
                    txParams.type === SignType.DECLARE) && (
                    <Text fontSize="md" color="gray.500">
                      {'Declare Contract Class'.toUpperCase()}
                    </Text>
                  )
                )}
              </HStack>
            </HStack>

            {tokenChanges && (
              <Stack
                spacing={1}
                px={2}
                py={1}
                borderRadius="4px"
                borderWidth="1px"
                maxW="full">
                <Text color="gray.500">Token Changes:</Text>
                <Box pl={4}>
                  {Array.from(tokenChanges.entries()).map(
                    ([tokenAddr, balance]) => {
                      return (
                        <HStack key={tokenAddr}>
                          <Text
                            fontSize="lg"
                            color={
                              !balance.amount.startsWith('-')
                                ? 'green.500'
                                : 'red.500'
                            }>
                            {new Decimal(balance.amount)
                              .toDecimalPlaces(balance.decimals)
                              .toString()}
                            &nbsp;
                            {balance.symbol}
                          </Text>

                          <TextLink
                            text={tokenAddr}
                            name="Token Address"
                            url={getAccountUrl(network, tokenAddr)}
                            urlLabel="View on explorer"
                          />
                        </HStack>
                      )
                    }
                  )}
                </Box>
              </Stack>
            )}
          </Stack>

          <Divider />
        </Box>

        <Box ref={anchorRef} w="full" bg={bg} zIndex={1} sx={tabsHeaderSx}>
          <Tabs w="full" px={6} index={tabIndex} onChange={setTabIndex}>
            <TabList>
              <Tab>DETAILS</Tab>
              <Tab>PAYLOAD</Tab>
            </TabList>
          </Tabs>
        </Box>

        <Stack w="full" px={6} pt={6} spacing={8}>
          <Tabs index={tabIndex}>
            <TabPanels>
              <TabPanel p={0}>
                <Stack spacing={8}>
                  {transfers?.length && (
                    <Stack
                      spacing={1}
                      px={2}
                      py={1}
                      borderRadius="4px"
                      borderWidth="1px"
                      maxW="full">
                      <Text color="gray.500">Transfer:</Text>
                      {transfers.map((transfer, i) => {
                        const addr =
                          transfer.to === account.address
                            ? transfer.from
                            : transfer.to
                        return (
                          <HStack key={i} justify="space-between">
                            <Text>
                              {new Decimal(transfer.amount)
                                .toDecimalPlaces(transfer.decimals)
                                .toString()}
                              &nbsp;
                              {transfer.symbol}
                            </Text>

                            <HStack>
                              <Text>
                                {transfer.to === account.address
                                  ? 'From'
                                  : 'To'}
                              </Text>
                              <TextLink
                                text={addr}
                                name="Address"
                                url={getAccountUrl(network, addr)}
                                urlLabel="View on explorer"
                              />
                            </HStack>
                          </HStack>
                        )
                      })}
                    </Stack>
                  )}

                  {trace === false && (
                    <AlertBox level="error" nowrap>
                      <Text>
                        We were not able to simulate transaction. There might be
                        an error and this transaction may fail.
                      </Text>
                      {!ignoreEstimateError && (
                        <Text
                          color="purple.500"
                          fontWeight="medium"
                          cursor="pointer"
                          onClick={() => {
                            setIgnoreEstimateError(true)
                          }}>
                          I want to proceed anyway
                        </Text>
                      )}
                    </AlertBox>
                  )}

                  <Stack spacing={6}>
                    <HStack justify="space-between">
                      <Text>
                        Gas Fee&nbsp;
                        <chakra.span fontSize="md" fontStyle="italic">
                          estimated
                        </chakra.span>
                      </Text>

                      <Text>
                        {gasFee &&
                          new Decimal(gasFee)
                            .div(new Decimal(10).pow(networkInfo.decimals))
                            .toDecimalPlaces(8)
                            .toString()}
                        &nbsp;
                        {networkInfo.currencySymbol}
                      </Text>
                    </HStack>

                    <HStack justify="space-between">
                      <Text>Max Gas Fee</Text>

                      <Text>
                        {maxFee !== undefined &&
                          new Decimal(maxFee.toString())
                            .div(new Decimal(10).pow(networkInfo.decimals))
                            .toDecimalPlaces(8)
                            .toString()}
                        &nbsp;
                        {networkInfo.currencySymbol}
                      </Text>
                    </HStack>

                    <HStack justify="space-between">
                      <Text>Nonce</Text>

                      <Text>{nonce !== undefined && nonce.toString()}</Text>
                    </HStack>
                  </Stack>
                </Stack>
              </TabPanel>
              <TabPanel>
                <StarknetTxPayload payload={payload} />
              </TabPanel>
            </TabPanels>
          </Tabs>

          <Divider />

          <HStack justify="center" spacing={12}>
            <Button
              size="lg"
              w={36}
              variant="outline"
              onClick={async () => {
                await CONSENT_SERVICE.processRequest(
                  { id: request.id } as ConsentRequest,
                  false
                )
                onComplete()
              }}>
              Reject
            </Button>
            <Button
              size="lg"
              w={36}
              colorScheme="purple"
              isDisabled={trace === false && !ignoreEstimateError}
              onClick={onConfirm}>
              Confirm
            </Button>
          </HStack>

          {suffix}
        </Stack>

        <SpinningOverlay loading={spinning} />
      </Box>
    </>
  )
}
