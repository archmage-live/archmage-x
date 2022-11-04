import { EditIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Center,
  Divider,
  HStack,
  Icon,
  Image,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
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
import { hexlify } from '@ethersproject/bytes'
import { BiQuestionMark } from '@react-icons/all-files/bi/BiQuestionMark'
import { BCS, TxnBuilderTypes, Types } from 'aptos'
import Decimal from 'decimal.js'
import * as React from 'react'
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react'

import { AlertBox } from '~components/AlertBox'
import { SpinningOverlay } from '~components/SpinningOverlay'
import { formatNumber } from '~lib/formatNumber'
import { IChainAccount, INetwork, ISubWallet, IWallet } from '~lib/schema'
import { CONSENT_SERVICE, ConsentRequest } from '~lib/services/consentService'
import { useCryptoComparePrice } from '~lib/services/datasource/cryptocompare'
import { NetworkInfo } from '~lib/services/network'
import {
  TransactionPayload,
  formatTxPayload,
  useNonce
} from '~lib/services/provider'
import { useAptosTransaction } from '~lib/services/provider/aptos/hooks'
import { DEFAULT_TXN_EXP_SEC_FROM_NOW } from '~lib/services/provider/aptos/provider'
import { Balance } from '~lib/services/token'
import { TransactionType } from '~lib/services/transaction'
import {
  AptosTxInfo,
  extractAptosIdentifier
} from '~lib/services/transaction/aptosParse'
import {
  useAptosTxCoinInfos,
  useAptosTxInfo
} from '~lib/services/transaction/aptosService'
import { shortenAddress } from '~lib/utils'
import {
  AptosTransactionChanges,
  AptosTransactionEvents,
  AptosTransactionPayload
} from '~pages/Popup/Consent/Transaction/AptosTransactionData'
import { FromToWithCheck } from '~pages/Popup/Consent/Transaction/FromTo'

import { useTabsHeaderScroll } from './helpers'

export const AptosTransaction = ({
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
  balance?: Balance
  suffix?: ReactNode
  onComplete: () => void
}) => {
  const payload = formatTxPayload(network, request.payload)
  const { txParams, populatedParams } = payload as {
    txParams: TxnBuilderTypes.RawTransaction
    populatedParams: Types.UserTransaction
  }

  const [ignoreEstimateError, setIgnoreEstimateError] = useState(false)

  const [gasPrice, setGasPrice] = useState(
    new Decimal(+populatedParams.gas_unit_price)
      .div(new Decimal(10).pow(networkInfo.decimals))
      .toDecimalPlaces(networkInfo.decimals)
      .toNumber()
  )
  const [gasPriceStr, setGasPriceStr] = useState(gasPrice.toString())
  useEffect(() => {
    setGasPriceStr(gasPrice.toString())
  }, [gasPrice])
  const [sequenceNumber, setSequenceNumber] = useState(
    +populatedParams.sequence_number
  )
  const [gasLimit, setGasLimit] = useState(+populatedParams.max_gas_amount)
  const [expirationSecs, setExpirationSecs] = useState(
    DEFAULT_TXN_EXP_SEC_FROM_NOW
  )

  const [editGasPrice, setEditGasPrice] = useState(false)
  const [editSequenceNumber, setEditSequenceNumber] = useState(false)
  const [editGasLimit, setEditGasLimit] = useState(false)
  const [editExpirationSecs, setEditExpirationSecs] = useState(false)

  const [rawTransaction, setRawTransaction] = useState(txParams)

  const { userTransaction } =
    useAptosTransaction(
      network,
      account,
      rawTransaction,
      editGasPrice,
      editGasLimit,
      expirationSecs
    ) || {}

  const userTx = useMemo(
    () => ({
      ...(userTransaction || populatedParams),
      type: 'user_transaction'
    }),
    [populatedParams, userTransaction]
  )

  const txInfo = useAptosTxInfo(account, userTx) as AptosTxInfo
  const [moduleAddr, moduleName, funcName] = extractAptosIdentifier(
    txInfo.function
  )

  const coinInfos = useAptosTxCoinInfos(network, userTx)
  const coinChanges = coinInfos?.get(account.address!)

  useEffect(() => {
    if (editGasPrice || !userTransaction) {
      return
    }
    setGasPrice(
      new Decimal(+userTransaction.gas_unit_price)
        .div(new Decimal(10).pow(networkInfo.decimals))
        .toDecimalPlaces(networkInfo.decimals)
        .toNumber()
    )
  }, [editGasPrice, userTransaction, networkInfo])
  useEffect(() => {
    if (!editGasPrice) {
      return
    }
    setRawTransaction((rawTransaction) => {
      const gasUnitPrice = new Decimal(gasPrice)
        .mul(new Decimal(10).pow(networkInfo.decimals))
        .toDecimalPlaces(0)
        .toNumber()
      if (rawTransaction.gas_unit_price === BigInt(gasUnitPrice)) {
        return rawTransaction
      }
      const {
        sender,
        sequence_number,
        payload,
        max_gas_amount,
        expiration_timestamp_secs,
        chain_id
      } = rawTransaction
      return new TxnBuilderTypes.RawTransaction(
        sender,
        sequence_number,
        payload,
        max_gas_amount,
        BigInt(gasUnitPrice),
        expiration_timestamp_secs,
        chain_id
      )
    })
  }, [editGasPrice, gasPrice, networkInfo])

  const managedSequenceNumber = useNonce(network, account)
  useEffect(() => {
    if (editSequenceNumber || managedSequenceNumber === undefined) {
      return
    }
    setSequenceNumber(managedSequenceNumber)
  }, [editSequenceNumber, managedSequenceNumber])
  useEffect(() => {
    if (!editSequenceNumber) {
      return
    }
    setRawTransaction((rawTransaction) => {
      if (rawTransaction.sequence_number === BigInt(sequenceNumber)) {
        return rawTransaction
      }
      const {
        sender,
        payload,
        max_gas_amount,
        gas_unit_price,
        expiration_timestamp_secs,
        chain_id
      } = rawTransaction
      return new TxnBuilderTypes.RawTransaction(
        sender,
        BigInt(sequenceNumber),
        payload,
        max_gas_amount,
        gas_unit_price,
        expiration_timestamp_secs,
        chain_id
      )
    })
  }, [editSequenceNumber, sequenceNumber])

  useEffect(() => {
    if (editGasLimit || !userTransaction) {
      return
    }
    setGasLimit(+userTransaction.max_gas_amount)
  }, [editGasLimit, userTransaction])
  useEffect(() => {
    if (!editGasLimit) {
      return
    }
    setRawTransaction((rawTransaction) => {
      if (rawTransaction.max_gas_amount === BigInt(gasLimit)) {
        return rawTransaction
      }
      const {
        sender,
        sequence_number,
        payload,
        gas_unit_price,
        expiration_timestamp_secs,
        chain_id
      } = rawTransaction
      return new TxnBuilderTypes.RawTransaction(
        sender,
        sequence_number,
        payload,
        BigInt(gasLimit),
        gas_unit_price,
        expiration_timestamp_secs,
        chain_id
      )
    })
  }, [editGasLimit, gasLimit])

  const gasUsed = +userTx.gas_used
  const gasFee = useMemo(() => {
    return new Decimal(userTx.gas_used)
      .mul(gasPrice)
      .toDecimalPlaces(networkInfo.decimals)
      .toString()
  }, [networkInfo, userTx, gasPrice])

  const bg = useColorModeValue('purple.50', 'gray.800')
  const bannerBg = useColorModeValue('white', 'black')

  const { scrollRef, anchorRef, tabsHeaderSx } = useTabsHeaderScroll()

  const [tabIndex, setTabIndex] = useState(0)

  const [spinning, setSpinning] = useState(false)

  const price = useCryptoComparePrice(networkInfo.currencySymbol)

  const value = useMemo(
    () =>
      txInfo.amount
        ? new Decimal(txInfo.amount).div(
            new Decimal(10).pow(networkInfo.decimals)
          )
        : undefined,
    [txInfo, networkInfo]
  )

  const onConfirm = useCallback(async () => {
    setSpinning(true)

    let { sender, payload, chain_id } = rawTransaction

    const gasUnitPrice = new Decimal(gasPrice)
      .mul(new Decimal(10).pow(networkInfo.decimals))
      .toDecimalPlaces(0)
      .toNumber()

    const expireTimestamp = Math.floor(Date.now() / 1000) + expirationSecs

    const rawTx = new TxnBuilderTypes.RawTransaction(
      sender,
      BigInt(sequenceNumber),
      payload,
      BigInt(gasLimit),
      BigInt(gasUnitPrice),
      BigInt(expireTimestamp),
      chain_id
    )

    const serializer = new BCS.Serializer()
    rawTx.serialize(serializer)

    await CONSENT_SERVICE.processRequest(
      {
        ...request,
        payload: {
          txParams: hexlify(serializer.getBytes()),
          populatedParams: userTransaction
        } as TransactionPayload
      },
      true
    )

    onComplete()
    setSpinning(false)
  }, [
    request,
    onComplete,
    networkInfo,
    rawTransaction,
    userTransaction,
    gasPrice,
    sequenceNumber,
    gasLimit,
    expirationSecs
  ])

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
            from={userTx.sender}
            to={txInfo.to}
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
                {txInfo.type === TransactionType.Send ? (
                  <Text fontSize="md" color="gray.500">
                    {`Send ${networkInfo.currencySymbol}`.toUpperCase()}
                  </Text>
                ) : txInfo.type === TransactionType.DeployContract ? (
                  <Text fontSize="md" color="gray.500">
                    {'Deploy Module'.toUpperCase()}
                  </Text>
                ) : (
                  <Text fontSize="md" noOfLines={3}>
                    <chakra.span color="blue.500">
                      {shortenAddress(moduleAddr)}
                    </chakra.span>
                    <chakra.span color="gray.500">&nbsp;::&nbsp;</chakra.span>
                    <chakra.span color="purple.500">{moduleName}</chakra.span>
                    <chakra.span color="orange.500">
                      &nbsp;::&nbsp;{funcName}
                    </chakra.span>
                  </Text>
                )}
              </HStack>
            </HStack>

            {value && (
              <Stack>
                <HStack>
                  {price && (
                    <Image
                      borderRadius="full"
                      boxSize="30px"
                      fit="cover"
                      src={price.imageUrl}
                      fallback={
                        <Center
                          w="30px"
                          h="30px"
                          borderRadius="full"
                          borderWidth="1px"
                          borderColor="gray.500">
                          <Icon as={BiQuestionMark} fontSize="3xl" />
                        </Center>
                      }
                      alt="Currency Logo"
                    />
                  )}

                  <Text fontSize="2xl" fontWeight="medium">
                    {formatNumber(value)} {networkInfo.currencySymbol}
                  </Text>
                </HStack>

                {price && (
                  <Text ps="15px">
                    {price.currencySymbol}&nbsp;
                    {formatNumber(value.mul(price.price || 0))}
                  </Text>
                )}
              </Stack>
            )}

            {coinChanges && (
              <Stack
                spacing={1}
                px={2}
                py={1}
                borderRadius="4px"
                borderWidth="1px"
                maxW="full">
                <Text color="gray.500">Coin Changes:</Text>
                <Box pl={4}>
                  {Array.from(coinChanges.entries()).map(
                    ([coinType, balance]) => {
                      return (
                        <Text
                          key={coinType}
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
              <Tab>EVENTS</Tab>
              <Tab>CHANGES</Tab>
            </TabList>
          </Tabs>
        </Box>

        <Stack w="full" px={6} pt={6} spacing={8}>
          <Tabs index={tabIndex}>
            <TabPanels>
              <TabPanel p={0}>
                <Stack spacing={8}>
                  {userTransaction?.success === false && (
                    <AlertBox level="error" nowrap>
                      <Text>
                        We were not able to simulate transaction. There might be
                        an error in the module and this transaction may fail.
                      </Text>
                      {userTransaction.vm_status && (
                        <Text color="yellow.500">
                          Reason: {userTransaction.vm_status}
                        </Text>
                      )}
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
                        {gasFee} {networkInfo.currencySymbol}
                      </Text>
                    </HStack>

                    <HStack justify="space-between">
                      <Text>Gas Unit Price</Text>

                      {!editGasPrice ? (
                        <HStack>
                          <Text>
                            {gasPrice} {networkInfo.currencySymbol}
                          </Text>
                          <Button
                            variant="link"
                            size="sm"
                            minW={0}
                            onClick={() => setEditGasPrice(true)}>
                            <EditIcon />
                          </Button>
                        </HStack>
                      ) : (
                        <HStack>
                          <NumberInput
                            maxW={48}
                            min={0}
                            step={new Decimal(1)
                              .div(new Decimal(10).pow(networkInfo.decimals))
                              .toNumber()}
                            keepWithinRange
                            allowMouseWheel
                            precision={networkInfo.decimals}
                            value={gasPriceStr}
                            onChange={(str) => {
                              setGasPriceStr(str)
                            }}
                            onBlur={() => {
                              if (Number.isNaN(+gasPriceStr)) {
                                setGasPriceStr(gasPrice.toString())
                              } else {
                                setGasPrice(+gasPriceStr)
                              }
                            }}>
                            <NumberInputField />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>

                          <Text> {networkInfo.currencySymbol}</Text>
                        </HStack>
                      )}
                    </HStack>

                    <HStack justify="space-between">
                      <Text>Sequence Number</Text>

                      {!editSequenceNumber ? (
                        <HStack>
                          <Text>{sequenceNumber}</Text>
                          <Button
                            variant="link"
                            size="sm"
                            minW={0}
                            onClick={() => setEditSequenceNumber(true)}>
                            <EditIcon />
                          </Button>
                        </HStack>
                      ) : (
                        <NumberInput
                          maxW={48}
                          min={0}
                          step={1}
                          keepWithinRange
                          allowMouseWheel
                          precision={0}
                          value={sequenceNumber}
                          onChange={(_, val) => setSequenceNumber(val)}>
                          <NumberInputField />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      )}
                    </HStack>

                    <HStack justify="space-between">
                      <Text>
                        Gas Used&nbsp;
                        <chakra.span fontSize="md" fontStyle="italic">
                          estimated
                        </chakra.span>
                        &nbsp;(Units)
                      </Text>

                      <Text>{gasUsed}</Text>
                    </HStack>

                    <HStack justify="space-between">
                      <Text>Max Gas Limit (Units)</Text>

                      {!editGasLimit ? (
                        <HStack>
                          <Text>{gasLimit}</Text>
                          <Button
                            variant="link"
                            size="sm"
                            minW={0}
                            onClick={() => setEditGasLimit(true)}>
                            <EditIcon />
                          </Button>
                        </HStack>
                      ) : (
                        <NumberInput
                          maxW={48}
                          min={0}
                          step={1}
                          keepWithinRange
                          allowMouseWheel
                          precision={0}
                          value={gasLimit}
                          onChange={(_, val) => setGasLimit(val)}>
                          <NumberInputField />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      )}
                    </HStack>

                    <HStack justify="space-between">
                      <Text>Expiration Time (Seconds)</Text>

                      {!editExpirationSecs ? (
                        <HStack>
                          <Text>{expirationSecs}</Text>
                          <Button
                            variant="link"
                            size="sm"
                            minW={0}
                            onClick={() => setEditExpirationSecs(true)}>
                            <EditIcon />
                          </Button>
                        </HStack>
                      ) : (
                        <NumberInput
                          maxW={48}
                          min={0}
                          step={1}
                          keepWithinRange
                          allowMouseWheel
                          precision={0}
                          value={expirationSecs}
                          onChange={(_, val) => setExpirationSecs(val)}>
                          <NumberInputField />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      )}
                    </HStack>
                  </Stack>
                </Stack>
              </TabPanel>
              <TabPanel p={0}>
                <AptosTransactionPayload tx={userTx} />
              </TabPanel>
              <TabPanel p={0}>
                <AptosTransactionEvents tx={userTx} />
              </TabPanel>
              <TabPanel p={0}>
                <AptosTransactionChanges tx={userTx} />
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
              isDisabled={!userTransaction?.success && !ignoreEstimateError}
              onClick={onConfirm}>
              Confirm
            </Button>
          </HStack>

          {suffix}
        </Stack>
      </Box>

      <SpinningOverlay loading={spinning} />
    </>
  )
}
