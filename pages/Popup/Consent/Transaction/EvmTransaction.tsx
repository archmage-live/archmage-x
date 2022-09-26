import { ChevronRightIcon, EditIcon, InfoIcon } from '@chakra-ui/icons'
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
  Tooltip,
  chakra,
  useColorModeValue,
  useDisclosure
} from '@chakra-ui/react'
import { BigNumber } from '@ethersproject/bignumber'
import Decimal from 'decimal.js'
import { useScroll } from 'framer-motion'
import * as React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BiQuestionMark } from 'react-icons/bi'
import HashLoader from 'react-spinners/HashLoader'

import { AlertBox } from '~components/AlertBox'
import { useColor } from '~hooks/useColor'
import { formatNumber } from '~lib/formatNumber'
import { IChainAccount, INetwork, ISubWallet, IWallet } from '~lib/schema'
import { CONSENT_SERVICE, ConsentRequest } from '~lib/services/consentService'
import { useCryptoComparePrice } from '~lib/services/datasource/cryptocompare'
import { NetworkInfo } from '~lib/services/network'
import {
  TransactionPayload,
  formatTxParams,
  useEstimateGasPrice
} from '~lib/services/provider'
import {
  EthGasPriceEstimate,
  EvmTxParams,
  EvmTxPopulatedParams,
  GasEstimateType,
  GasFeeEstimates,
  GasFeeEstimation,
  GasOption,
  LegacyGasPriceEstimate,
  MaxFeePerGas,
  isSourcedGasFeeEstimates,
  parseGwei,
  useDefaultGasFeeSettings,
  useEvmFunctionSignature
} from '~lib/services/provider/evm'
import { Balance } from '~lib/services/token'
import { shortenAddress } from '~lib/utils'

import { EvmAdvancedGasFeeModal } from './EvmAdvancedGasFeeModal'
import {
  EvmGasFeeEditModal,
  NETWORK_CONGESTION_THRESHOLDS,
  minWaitTimeColor,
  minWaitTimeText,
  optionGasFee,
  optionIcon,
  optionTitle
} from './EvmGasFeeEditModal'
import { FromToWithCheck } from './FromTo'

export const EvmTransaction = ({
  origin,
  request,
  network,
  networkInfo,
  wallet,
  subWallet,
  account,
  balance
}: {
  origin: string
  request: ConsentRequest
  network: INetwork
  networkInfo: NetworkInfo
  wallet: IWallet
  subWallet: ISubWallet
  account: IChainAccount
  balance?: Balance
}) => {
  const payload = request.payload as TransactionPayload
  formatTxParams(network, payload.txParams, payload.populatedParams)

  const txParams = payload.txParams as EvmTxParams
  const populated = payload.populatedParams as EvmTxPopulatedParams
  useEffect(() => {
    console.log('payload:', payload)
  }, [payload])

  const functionSig = useEvmFunctionSignature(txParams.data)

  const [ignoreEstimateError, setIgnoreEstimateError] = useState(false)

  const gasPrice = useEstimateGasPrice(network, 10000) as
    | GasFeeEstimation
    | undefined
  useEffect(() => {
    console.log('gasPrice:', gasPrice)
  }, [gasPrice])

  const [nonce, setNonce] = useState(BigNumber.from(txParams.nonce!).toNumber())
  const [gasLimit, setGasLimit] = useState(
    BigNumber.from(txParams.gasLimit!).toNumber()
  )
  const [editNonce, setEditNonce] = useState(false)
  const [editGasLimit, setEditGasLimit] = useState(false)

  const [isGasLimitValid, setIsGasLimitValid] = useState(false)
  useEffect(() => {
    setIsGasLimitValid(gasLimit >= GAS_LIMIT_MIN && gasLimit <= GAS_LIMIT_MAX)
  }, [gasLimit])

  const bg = useColorModeValue('purple.50', 'gray.800')
  const bannerBg = useColorModeValue('white', 'black')

  const scrollRef = useRef(null)
  const anchorRef = useRef(null)
  const { scrollYProgress } = useScroll({
    container: scrollRef,
    target: anchorRef,
    offset: ['start start', 'end end']
  })
  const [tabsHeaderSx, setTabsHeaderSx] = useState<any>()
  useEffect(() => {
    return scrollYProgress.onChange((progress) => {
      setTabsHeaderSx(
        progress <= 0 ? { position: 'sticky', top: -1 } : undefined
      )
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [spinning, setSpinning] = useState(false)
  const spinnerColor = useColor('purple.500', 'purple.500')

  const price = useCryptoComparePrice(networkInfo.currencySymbol)

  const {
    defaultGasFeeOption,
    defaultAdvancedGasFee,
    setDefaultAdvancedGasFee
  } = useDefaultGasFeeSettings(network.id)

  const [activeOption, setActiveOption] = useState<GasOption>()

  useEffect(() => {
    setActiveOption((activeOption) => {
      return activeOption || defaultGasFeeOption
    })
  }, [defaultGasFeeOption])

  const [customGasFeePerGas, setCustomGasFeePerGas] = useState<MaxFeePerGas>()

  useEffect(() => {
    setCustomGasFeePerGas((customGasFeePerGas) => {
      return customGasFeePerGas || defaultAdvancedGasFee
    })
  }, [defaultAdvancedGasFee])

  const {
    isOpen: isGasFeeEditOpen,
    onOpen: onGasFeeEditOpen,
    onClose: onGasFeeEditClose
  } = useDisclosure()

  const {
    isOpen: isAdvancedGasFeeOpen,
    onOpen: _onAdvancedGasFeeOpen,
    onClose: _onAdvancedGasFeeClose
  } = useDisclosure()

  const [confirmAdvancedGasFee, setConfirmAdvancedGasFee] = useState(false)

  const onAdvancedGasFeeOpen = useCallback(
    (confirm?: boolean) => {
      setConfirmAdvancedGasFee(confirm ?? false)
      _onAdvancedGasFeeOpen()
    },
    [_onAdvancedGasFeeOpen]
  )

  const onAdvancedGasFeeClose = useCallback(
    (customGasFeePerGas?: MaxFeePerGas, enableDefault?: boolean) => {
      if (customGasFeePerGas) {
        setCustomGasFeePerGas(customGasFeePerGas)
        if (enableDefault) {
          setDefaultAdvancedGasFee(customGasFeePerGas)
        }
        if (confirmAdvancedGasFee) {
          setActiveOption(GasOption.ADVANCED)
          onGasFeeEditClose()
        }
      }
      _onAdvancedGasFeeClose()
    },
    [
      _onAdvancedGasFeeClose,
      confirmAdvancedGasFee,
      onGasFeeEditClose,
      setDefaultAdvancedGasFee
    ]
  )

  const [normalFee, maxFee] =
    (gasPrice &&
      activeOption &&
      computeFee(
        gasPrice,
        txParams.gasLimit as BigNumber,
        activeOption,
        networkInfo.decimals,
        customGasFeePerGas?.maxPriorityFeePerGas,
        customGasFeePerGas?.maxFeePerGas
      )) ||
    []

  const value = computeValue(
    (txParams.value as BigNumber) || 0,
    networkInfo.decimals
  )

  const normalTotal = normalFee?.add(value)
  const maxTotal = maxFee?.add(value)

  const insufficientBalance = balance && normalTotal?.gt(balance.amount)

  const Data = () => {
    return <></>
  }

  const Hex = () => {
    return <></>
  }

  return (
    <Stack w="full" h="full" spacing={0} position="relative">
      <Stack>
        <Center pt={4} px={6}>
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
            from={txParams.from!}
            to={txParams.to || ''}
          />
        </Box>

        <Divider />

        {/*{true && (*/}
        {/*  <>*/}

        {/*    <Box px={6} py={2}>*/}
        {/*      <AlertBox level="info">*/}
        {/*        New address detected! Click here to add to your address book.*/}
        {/*      </AlertBox>*/}
        {/*    </Box>*/}

        {/*    <Divider />*/}
        {/*  </>*/}
        {/*)}*/}
      </Stack>

      <Box ref={scrollRef} overflowY="auto" position="relative" pb={6}>
        <Box w="full" bg={bannerBg}>
          <Stack px={6} py={6} spacing={4}>
            <Text>{origin}</Text>

            <HStack>
              <HStack px={2} py={1} borderRadius="4px" borderWidth="1px">
                <Text fontSize="md" color="blue.500">
                  {shortenAddress(txParams.to)}
                </Text>

                {functionSig && (
                  <Text fontSize="md" color="gray.500">
                    <span>: {functionSig.name.toUpperCase()}</span>
                    &nbsp;
                    <Tooltip label="We cannot verify this contract. Make sure you trust this address.">
                      <InfoIcon />
                    </Tooltip>
                  </Text>
                )}
              </HStack>
            </HStack>

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
          </Stack>
          <Divider />
        </Box>

        <Box ref={anchorRef} w="full" bg={bg} zIndex={1} sx={tabsHeaderSx}>
          <Tabs w="full" px={6}>
            <TabList>
              <Tab>DETAILS</Tab>
              <Tab>DATA</Tab>
              <Tab>HEX</Tab>
            </TabList>
          </Tabs>
        </Box>

        <Stack w="full" px={6} pt={6} spacing={8}>
          <Tabs>
            <TabPanels>
              <TabPanel p={0}>
                <Stack spacing={16}>
                  <Stack spacing={8}>
                    {isNetworkBusy(gasPrice) && (
                      <AlertBox>
                        Network is busy. Gas prices are high and estimates are
                        less accurate.
                      </AlertBox>
                    )}

                    {populated.code && (
                      <AlertBox level="error" nowrap>
                        <Text>
                          We were not able to estimate gas. There might be an
                          error in the contract and this transaction may fail.
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

                    {(!populated.code || ignoreEstimateError) && (
                      <>
                        {activeOption === GasOption.LOW && (
                          <AlertBox>
                            Future transactions will queue after this one.
                          </AlertBox>
                        )}

                        <Stack spacing={2}>
                          <HStack justify="end">
                            <Button
                              variant="ghost"
                              colorScheme="blue"
                              size="sm"
                              px={1}
                              rightIcon={<ChevronRightIcon fontSize="xl" />}
                              onClick={onGasFeeEditOpen}>
                              {activeOption && optionIcon(activeOption)}
                              &nbsp;
                              {activeOption && optionTitle(activeOption)}
                            </Button>

                            {activeOption === GasOption.ADVANCED && (
                              <Button
                                variant="link"
                                size="sm"
                                minW={0}
                                onClick={() => onAdvancedGasFeeOpen(false)}>
                                <EditIcon />
                              </Button>
                            )}
                          </HStack>

                          <HStack justify="space-between">
                            <Text>
                              <chakra.span fontWeight="bold">Gas</chakra.span>
                              &nbsp;
                              <chakra.span fontSize="md" fontStyle="italic">
                                (estimated)
                              </chakra.span>
                              &nbsp;
                              <Tooltip
                                label={
                                  <Stack>
                                    <Text>
                                      Gas fee is paid to miners/validators who
                                      process transactions on the Ethereum
                                      network. Archmage does not profit from gas
                                      fees.
                                    </Text>
                                    <Text>
                                      Gas fee is set by the network and
                                      fluctuate based on network traffic and
                                      transaction complexity.
                                    </Text>
                                  </Stack>
                                }>
                                <InfoIcon verticalAlign="baseline" />
                              </Tooltip>
                            </Text>

                            <Stack align="end" spacing={0}>
                              <Text fontWeight="bold">
                                {normalFee?.toDecimalPlaces(8).toString()}
                                &nbsp;
                                {networkInfo.currencySymbol}
                              </Text>
                              <Text>
                                {price ? (
                                  <>
                                    {price.currencySymbol}&nbsp;
                                    {formatNumber(
                                      normalFee?.mul(price.price || 0)
                                    )}
                                  </>
                                ) : (
                                  <>
                                    {normalFee?.toDecimalPlaces(8).toString()}
                                  </>
                                )}
                              </Text>
                            </Stack>
                          </HStack>

                          <HStack justify="space-between">
                            <Text
                              color={
                                activeOption && minWaitTimeColor(activeOption)
                              }
                              fontSize="sm"
                              fontWeight="medium">
                              {gasPrice?.gasEstimateType ===
                                GasEstimateType.FEE_MARKET &&
                                activeOption &&
                                minWaitTimeText(
                                  activeOption,
                                  gasPrice.gasFeeEstimates as GasFeeEstimates,
                                  customGasFeePerGas?.maxPriorityFeePerGas,
                                  customGasFeePerGas?.maxFeePerGas
                                )}
                            </Text>

                            <Text color="gray.500">
                              Max:&nbsp;
                              {maxFee?.toDecimalPlaces(8).toString()}
                              &nbsp;
                              {networkInfo.currencySymbol}
                            </Text>
                          </HStack>
                        </Stack>

                        <Divider />
                      </>
                    )}

                    <Stack spacing={2}>
                      <HStack justify="space-between">
                        <Text fontWeight="bold">Total</Text>

                        <Stack align="end" spacing={0}>
                          <Text fontWeight="bold">
                            {normalTotal?.toDecimalPlaces(8).toString()}
                            &nbsp;
                            {networkInfo.currencySymbol}
                          </Text>
                          <Text>
                            {price ? (
                              <>
                                {price.currencySymbol}&nbsp;
                                {formatNumber(
                                  normalTotal?.mul(price.price || 0)
                                )}
                              </>
                            ) : (
                              <>{normalTotal?.toDecimalPlaces(8).toString()}</>
                            )}
                          </Text>
                        </Stack>
                      </HStack>

                      <HStack justify="space-between">
                        <Text color="gray.500" fontSize="sm">
                          Amount + Gas Fee
                        </Text>

                        <Text color="gray.500">
                          Max:&nbsp;
                          {maxTotal?.toDecimalPlaces(8).toString()}
                          &nbsp;
                          {networkInfo.currencySymbol}
                        </Text>
                      </HStack>
                    </Stack>
                  </Stack>

                  <Stack spacing={6}>
                    <HStack justify="space-between">
                      <Text>Nonce</Text>

                      {!editNonce ? (
                        <HStack>
                          <Text>{nonce}</Text>
                          <Button
                            variant="link"
                            size="sm"
                            minW={0}
                            onClick={() => setEditNonce(true)}>
                            <EditIcon />
                          </Button>
                        </HStack>
                      ) : (
                        <NumberInput
                          min={0}
                          step={1}
                          keepWithinRange
                          allowMouseWheel
                          precision={0}
                          value={nonce}
                          onChange={(_, val) => setNonce(val)}>
                          <NumberInputField />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      )}
                    </HStack>

                    <HStack justify="space-between">
                      <Text>Gas limit</Text>

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
                          min={0}
                          step={1}
                          keepWithinRange
                          allowMouseWheel
                          precision={0}
                          value={gasLimit}
                          isInvalid={!isGasLimitValid}
                          onChange={(_, val) => setGasLimit(val)}>
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
                <Data />
              </TabPanel>
              <TabPanel p={0}>
                <Hex />
              </TabPanel>
            </TabPanels>
          </Tabs>

          <Divider />

          {!isGasLimitValid && (
            <AlertBox level="error">
              Gas limit must be &gt;= {GAS_LIMIT_MIN} and &lt;= {GAS_LIMIT_MAX}
            </AlertBox>
          )}

          {insufficientBalance && (
            <AlertBox level="error">
              You do not have enough {networkInfo.currencySymbol} in your
              account to pay for transaction fees on Ethereum Mainnet network.
              Buy {networkInfo.currencySymbol} or deposit from another account.
            </AlertBox>
          )}

          <HStack justify="center" spacing={12}>
            <Button
              size="lg"
              w={36}
              variant="outline"
              onClick={async () => {
                await CONSENT_SERVICE.processRequest(request, false)
                window.close()
              }}>
              Reject
            </Button>
            <Button
              size="lg"
              w={36}
              colorScheme="purple"
              isDisabled={
                (populated.code && !ignoreEstimateError) ||
                insufficientBalance ||
                !isGasLimitValid
              }
              onClick={async () => {
                setSpinning(true)
                await CONSENT_SERVICE.processRequest(request, true)
                window.close()
              }}>
              Confirm
            </Button>
          </HStack>
        </Stack>
      </Box>

      {spinning && (
        <Center
          position="absolute"
          w="full"
          h="full"
          bg="blackAlpha.600"
          zIndex={1}>
          <HashLoader color={spinnerColor.toHexString()} speedMultiplier={3} />
        </Center>
      )}

      {gasPrice?.gasEstimateType === GasEstimateType.FEE_MARKET &&
      activeOption ? (
        <>
          <EvmGasFeeEditModal
            network={network}
            isOpen={isGasFeeEditOpen && !isAdvancedGasFeeOpen}
            onClose={onGasFeeEditClose}
            onAdvancedOpen={onAdvancedGasFeeOpen}
            activeOption={activeOption}
            setActiveOption={setActiveOption}
            currencySymbol={networkInfo.currencySymbol}
            gasFeeEstimates={gasPrice.gasFeeEstimates as GasFeeEstimates}
            customGasFeePerGas={customGasFeePerGas}
            gasLimit={txParams.gasLimit as BigNumber}
            fromSite={false}
            origin={origin}
          />

          <EvmAdvancedGasFeeModal
            network={network}
            isOpen={isAdvancedGasFeeOpen}
            onClose={onAdvancedGasFeeClose}
            closeOnOverlayClick={!isGasFeeEditOpen}
            gasFeeEstimates={gasPrice.gasFeeEstimates as GasFeeEstimates}
            customGasFeePerGas={customGasFeePerGas}
            gasLimit={txParams.gasLimit as BigNumber}
            currencySymbol={networkInfo.currencySymbol}
          />
        </>
      ) : (
        <></>
      )}
    </Stack>
  )
}

function computeFee(
  gasPrice: GasFeeEstimation,
  gasLimit: BigNumber,
  option: GasOption,
  decimals: number,
  customMaxPriorityFeePerGas?: string,
  customMaxFeePerGas?: string
) {
  let normalFee, maxFee
  switch (gasPrice.gasEstimateType) {
    case GasEstimateType.FEE_MARKET: {
      const estimates = gasPrice.gasFeeEstimates as GasFeeEstimates
      const gasFee = optionGasFee(
        option,
        estimates,
        customMaxPriorityFeePerGas,
        customMaxFeePerGas
      )
      if (!gasFee) {
        return
      }
      maxFee = parseGwei(gasFee.suggestedMaxFeePerGas)
      if (isSourcedGasFeeEstimates(estimates)) {
        normalFee = parseGwei(estimates.estimatedBaseFee).add(
          parseGwei(gasFee.suggestedMaxPriorityFeePerGas)
        )
      }
      break
    }
    case GasEstimateType.LEGACY: {
      const estimates = gasPrice.gasFeeEstimates as LegacyGasPriceEstimate
      // TODO
      return
    }
    case GasEstimateType.ETH_GAS_PRICE: {
      const estimates = gasPrice.gasFeeEstimates as EthGasPriceEstimate
      normalFee = parseGwei(estimates.gasPrice)
      maxFee = normalFee
      break
    }
  }

  if (!normalFee || !maxFee) {
    return
  }

  return [
    new Decimal(normalFee.toString())
      .mul(gasLimit.toString())
      .div(new Decimal(10).pow(decimals)),
    new Decimal(maxFee.toString())
      .mul(gasLimit.toString())
      .div(new Decimal(10).pow(decimals))
  ]
}

function computeValue(value: BigNumber | number, decimals: number) {
  return new Decimal(value.toString()).div(new Decimal(10).pow(decimals))
}

function isNetworkBusy(gasPrice?: GasFeeEstimation) {
  if (gasPrice?.gasEstimateType !== GasEstimateType.FEE_MARKET) {
    return
  }
  const estimates = gasPrice.gasFeeEstimates as GasFeeEstimates
  if (!isSourcedGasFeeEstimates(estimates)) {
    return
  }

  return estimates.networkCongestion >= NETWORK_CONGESTION_THRESHOLDS.BUSY
}

const GAS_LIMIT_MIN = 21000
const GAS_LIMIT_MAX = 7920027
