import {
  Box,
  Button,
  Center,
  Divider,
  HStack,
  Stack,
  Tab,
  TabList,
  TabPanels,
  Tabs,
  Text,
  useColorModeValue
} from '@chakra-ui/react'
import Decimal from 'decimal.js'
import * as React from 'react'
import { ReactNode, useCallback, useMemo, useState } from 'react'
import { TransactionType } from 'starknet'

import { SpinningOverlay } from '~components/SpinningOverlay'
import { TextLink } from '~components/TextLink'
import { IChainAccount, INetwork, ISubWallet, IWallet } from '~lib/schema'
import { CONSENT_SERVICE, ConsentRequest } from '~lib/services/consentService'
import { useCryptoComparePrice } from '~lib/services/datasource/cryptocompare'
import { NetworkInfo, getAccountUrl } from '~lib/services/network'
import { useStarknetTransaction } from '~lib/services/provider/starknet/hooks'
import {
  SignType,
  StarknetTransactionPayload
} from '~lib/services/provider/starknet/types'
import { Amount } from '~lib/services/token'
import {
  useStarknetTokenChanges,
  useStarknetTxEvents
} from '~lib/services/transaction/starknet/events'
import { FromToWithCheck } from '~pages/Popup/Consent/Transaction/FromTo'
import { useTabsHeaderScroll } from '~pages/Popup/Consent/Transaction/helpers'

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

  const to = useMemo(() => {
    switch (txParams.type) {
      case TransactionType.INVOKE:
        if (txParams.payload.length !== 1) {
          return
        }
        return txParams.payload[0].contractAddress
      case SignType.INVOKE:
        if (txParams.details[0].length !== 1) {
          return
        }
        return txParams.details[0][0].contractAddress
      default:
    }
  }, [txParams])

  const trace = useStarknetTransaction(network, account, request.payload)
  const events = useStarknetTxEvents(trace?.function_invocation)
  const allTokenChanges = useStarknetTokenChanges(network, events.transfers)
  const tokenChanges = allTokenChanges?.get(account.address!)

  // console.log(request.payload)
  // console.log(trace)
  console.log(events)
  console.log(tokenChanges)

  const [ignoreEstimateError, setIgnoreEstimateError] = useState(false)

  const price = useCryptoComparePrice(networkInfo.currencySymbol)

  const bg = useColorModeValue('purple.50', 'gray.800')
  const bannerBg = useColorModeValue('white', 'black')

  const { scrollRef, anchorRef, tabsHeaderSx } = useTabsHeaderScroll()

  const [tabIndex, setTabIndex] = useState(0)

  const [spinning, setSpinning] = useState(false)

  const onConfirm = useCallback(async () => {}, [])

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
                <Text color="gray.500">Coin Changes:</Text>
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
            <TabPanels></TabPanels>
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
              isDisabled={!ignoreEstimateError}
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
