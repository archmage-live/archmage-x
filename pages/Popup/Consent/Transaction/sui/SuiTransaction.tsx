import {
  Badge,
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
  useColorModeValue
} from '@chakra-ui/react'
// TODO: deprecated
import { MoveCallTransaction, TransferObjectsTransaction } from '@mysten/sui.js'
import { TransactionBlock } from '@mysten/sui.js/transactions'
import { parseStructTag } from '@mysten/sui.js/utils'
import { normalizeStructTag, normalizeSuiAddress } from '@mysten/sui.js/utils'
import Decimal from 'decimal.js'
import { ReactNode, useCallback, useMemo, useState } from 'react'
import { is } from 'superstruct'

import { AlertBox } from '~components/AlertBox'
import { FromToWithCheck } from '~components/FromTo'
import { SpinningOverlay } from '~components/SpinningOverlay'
import { IChainAccount, INetwork, ISubWallet, IWallet } from '~lib/schema'
import { CONSENT_SERVICE, ConsentRequest } from '~lib/services/consentService'
import { NetworkInfo } from '~lib/services/network'
import { formatTxPayload } from '~lib/services/provider'
import { useSuiTransaction } from '~lib/services/provider/sui/hooks'
import { Amount } from '~lib/services/token'
import { useSuiTokenInfos } from '~lib/services/token/sui'
import { useTabsHeaderScroll } from '~pages/Popup/Consent/Transaction/helpers'
import {
  SuiTransactionData,
  SuiTransactionDryRun
} from '~pages/Popup/Consent/Transaction/sui/SuiTransactionData'

export const SuiTransaction = ({
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
  const payload = formatTxPayload(network, request.payload)
  const txParams = payload.txParams as TransactionBlock

  const gas = useMemo(() => txParams.blockData.gasConfig, [txParams])

  const to = useMemo(() => {
    const txs = txParams.blockData.transactions.filter(
      (tx) => tx.kind !== 'SplitCoins' && tx.kind !== 'MergeCoins'
    )
    if (txs.length === 1) {
      const tx = txs[0]
      if (is(tx, TransferObjectsTransaction)) {
        if (
          tx.address.kind === 'Input' &&
          typeof tx.address.value === 'string'
        ) {
          return tx.address.value
        }
      } else if (is(tx, MoveCallTransaction)) {
        return tx.target
      }
    }
    return undefined
  }, [txParams])

  const operation = useMemo(() => {
    const txs = txParams.blockData.transactions
    if (txs.length === 1) {
      return txs[0].kind
    }
    const kinds = txs
      .filter((tx) => tx.kind !== 'SplitCoins' && tx.kind !== 'MergeCoins')
      .map((tx) => tx.kind)
    if (kinds.length) {
      return kinds.length === 1 ? kinds[0] : `${kinds[0]}...`
    }
    return `${txs.map((tx) => tx.kind)[0]}...`
  }, [txParams])

  const dryRun = useSuiTransaction(network, account, txParams)

  const tokenInfos = useSuiTokenInfos(network.chainId)

  const [ignoreEstimateError, setIgnoreEstimateError] = useState(false)

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
                <Text fontSize="md" color="gray.500">
                  {operation.toUpperCase()}
                </Text>
              </HStack>
            </HStack>

            {dryRun && dryRun.balanceChanges.length && (
              <Stack
                spacing={1}
                px={2}
                py={1}
                borderRadius="4px"
                borderWidth="1px"
                maxW="full">
                <Text color="gray.500">Token Changes:</Text>
                <Box pl={4}>
                  {dryRun.balanceChanges.map((change, i) => {
                    const owner = (change.owner as any).AddressOwner
                    if (
                      !owner ||
                      normalizeSuiAddress(owner) !==
                        normalizeSuiAddress(account.address!)
                    ) {
                      return undefined
                    }

                    const tokenInfo = tokenInfos?.get(
                      normalizeStructTag(change.coinType)
                    )

                    const symbol = getCoinSymbol(
                      parseStructTag(change.coinType)
                    )

                    return (
                      <HStack key={i}>
                        <Text
                          fontSize="lg"
                          color={
                            !new Decimal(change.amount).isNegative()
                              ? 'green.500'
                              : 'red.500'
                          }>
                          {new Decimal(change.amount)
                            .div(new Decimal(10).pow(tokenInfo?.decimals || 0))
                            .toDecimalPlaces(8)
                            .toString()}
                          &nbsp;
                          {tokenInfo?.symbol || symbol}
                        </Text>
                        {!tokenInfo?.symbol && (
                          <Badge colorScheme="red">Unrecognized</Badge>
                        )}
                      </HStack>
                    )
                  })}
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
              <Tab>DATA</Tab>
              <Tab>Simulation</Tab>
            </TabList>
          </Tabs>
        </Box>

        <Stack w="full" px={6} pt={6} spacing={8}>
          <Tabs index={tabIndex}>
            <TabPanels>
              <TabPanel p={0}>
                <Stack spacing={8}>
                  {(dryRun === false ||
                    dryRun?.effects.status.status === 'failure') && (
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
                      <Text>Gas Budget</Text>
                      <Text>
                        {gas.budget !== undefined &&
                          new Decimal(gas.budget.toString())
                            .div(new Decimal(10).pow(networkInfo.decimals))
                            .toDecimalPlaces(8)
                            .toString()}
                        &nbsp;
                        {networkInfo.currencySymbol}
                      </Text>
                    </HStack>

                    <HStack justify="space-between">
                      <Text>Gas Price</Text>
                      <Text>
                        {gas.price !== undefined &&
                          new Decimal(gas.price.toString())
                            .div(new Decimal(10).pow(networkInfo.decimals))
                            .toDecimalPlaces(8)
                            .toString()}
                        &nbsp;
                        {networkInfo.currencySymbol}
                      </Text>
                    </HStack>
                  </Stack>
                </Stack>
              </TabPanel>
              <TabPanel p={0}>
                <SuiTransactionData data={txParams} />
              </TabPanel>
              <TabPanel p={0}>
                <SuiTransactionDryRun dryRun={dryRun} />
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
              isDisabled={
                (dryRun === false ||
                  dryRun?.effects.status.status === 'failure') &&
                !ignoreEstimateError
              }
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

type StructTag = {
  address: string
  module: string
  name: string
  typeParams: (string | StructTag)[]
}

function getCoinSymbol(tag: StructTag): string {
  if (tag.typeParams.length) {
    // use the last param
    const lastParam = tag.typeParams[tag.typeParams.length - 1]
    return typeof lastParam === 'string' ? lastParam : getCoinSymbol(lastParam)
  } else {
    return tag.name
  }
}
