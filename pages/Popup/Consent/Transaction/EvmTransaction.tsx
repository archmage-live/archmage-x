import { ChevronRightIcon, InfoIcon } from '@chakra-ui/icons'
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
import { ethers } from 'ethers'
import { useScroll } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import * as React from 'react'
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
  LegacyGasPriceEstimate,
  isSourcedGasFeeEstimates
} from '~lib/services/provider/evm'
import { shortenAddress } from '~lib/utils'

import {
  EvmGasFeeEditModal,
  GasOption,
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
  account
}: {
  origin: string
  request: ConsentRequest
  network: INetwork
  networkInfo: NetworkInfo
  wallet: IWallet
  subWallet: ISubWallet
  account: IChainAccount
}) => {
  const payload = request.payload as TransactionPayload
  formatTxParams(network, payload.txParams, payload.populatedParams)

  const txParams = payload.txParams as EvmTxParams
  const populated = payload.populatedParams as EvmTxPopulatedParams
  useEffect(() => {
    console.log('payload:', payload)
  }, [payload])

  const [ignoreEstimateError, setIgnoreEstimateError] = useState(false)

  const gasPrice = useEstimateGasPrice(network, 10000) as GasFeeEstimation
  useEffect(() => {
    console.log('gasPrice:', gasPrice)
  }, [gasPrice])

  const [nonce, setNonce] = useState(BigNumber.from(txParams.nonce!).toNumber())

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
    isOpen: isGasFeeEditOpen,
    onOpen: onGasFeeEditOpen,
    onClose: onGasFeeEditClose
  } = useDisclosure()

  const {
    isOpen: isGasFeeAdvancedEditOpen,
    onOpen: onGasFeeAdvancedEditOpen,
    onClose: onGasFeeAdvancedEditClose
  } = useDisclosure()

  const [activeOption, setActiveOption] = useState<GasOption>(GasOption.MEDIUM)

  const [normalFee, maxFee] =
    (gasPrice &&
      computeFee(
        gasPrice,
        txParams.gasLimit as BigNumber,
        activeOption,
        networkInfo.decimals
      )) ||
    []

  const value = computeValue(
    (txParams.value as BigNumber) || 0,
    networkInfo.decimals
  )

  const Details = () => {
    return (
      <Stack spacing={16}>
        <Stack spacing={8}>
          {populated.code && (
            <AlertBox level="error" nowrap>
              <Text>
                We were not able to estimate gas. There might be an error in the
                contract and this transaction may fail.
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
              <Stack spacing={2}>
                <HStack justify="end" spacing={0}>
                  <Button
                    variant="ghost"
                    colorScheme="blue"
                    size="sm"
                    px={2}
                    rightIcon={<ChevronRightIcon fontSize="xl" />}
                    onClick={onGasFeeEditOpen}>
                    {optionIcon(activeOption)} {optionTitle(activeOption)}
                  </Button>

                  {activeOption === GasOption.ADVANCED && (
                    <Button
                      variant="ghost"
                      colorScheme="blue"
                      size="sm"
                      px={2}
                      onClick={onGasFeeAdvancedEditOpen}>
                      Edit
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
                            Gas fee is paid to miners/validators who process
                            transactions on the Ethereum network. Archmage does
                            not profit from gas fees.
                          </Text>
                          <Text>
                            Gas fee is set by the network and fluctuate based on
                            network traffic and transaction complexity.
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
                          {formatNumber(normalFee?.mul(price.price || 0))}
                        </>
                      ) : (
                        <>{normalFee?.toDecimalPlaces(8).toString()}</>
                      )}
                    </Text>
                  </Stack>
                </HStack>

                <HStack justify="space-between">
                  <Text color="green.500" fontSize="sm" fontWeight="medium">
                    Likely in {'< 30'} seconds
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
                  {normalFee?.add(value).toDecimalPlaces(8).toString()}
                  &nbsp;
                  {networkInfo.currencySymbol}
                </Text>
                <Text>
                  {price ? (
                    <>
                      {price.currencySymbol}&nbsp;
                      {formatNumber(
                        normalFee?.add(value).mul(price.price || 0)
                      )}
                    </>
                  ) : (
                    <>{normalFee?.add(value).toDecimalPlaces(8).toString()}</>
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
                {maxFee?.add(value).toDecimalPlaces(8).toString()}
                &nbsp;
                {networkInfo.currencySymbol}
              </Text>
            </HStack>
          </Stack>
        </Stack>

        <HStack justify="space-between">
          <Text>Nonce</Text>

          <NumberInput
            min={0}
            step={1}
            keepWithinRange
            precision={0}
            value={nonce}
            onChange={(_, val) => setNonce(val)}>
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </HStack>
      </Stack>
    )
  }

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

        {true && (
          <>
            <Divider />

            <Box px={6} py={2}>
              <AlertBox level="info">
                New address detected! Click here to add to your address book.
              </AlertBox>
            </Box>

            <Divider />
          </>
        )}
      </Stack>

      <Box ref={scrollRef} overflowY="auto" position="relative" pb={6}>
        <Box w="full" bg={bannerBg}>
          <Stack px={6} py={6} spacing={4}>
            <Text>{origin}</Text>

            <Box
              w="min-content"
              px={2}
              py={1}
              borderRadius="4px"
              borderWidth="1px">
              <Text fontSize="md" color="blue.500">
                {shortenAddress(txParams.to)}
              </Text>
            </Box>

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
                <Details />
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

          <AlertBox level="error">
            You do not have enough ETH in your account to pay for transaction
            fees on Ethereum Mainnet network. Buy ETH or deposit from another
            account.
          </AlertBox>

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

      {gasPrice?.gasEstimateType === GasEstimateType.FEE_MARKET ? (
        <EvmGasFeeEditModal
          isOpen={isGasFeeEditOpen}
          onClose={onGasFeeEditClose}
          activeOption={activeOption}
          setActiveOption={setActiveOption}
          currencySymbol={networkInfo.currencySymbol}
          gasFeeEstimates={gasPrice.gasFeeEstimates as GasFeeEstimates}
          gasLimit={txParams.gasLimit as BigNumber}
          fromSite={false}
          origin={origin}
        />
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
  decimals: number
) {
  let normalFee, maxFee
  switch (gasPrice.gasEstimateType) {
    case GasEstimateType.FEE_MARKET: {
      const estimates = gasPrice.gasFeeEstimates as GasFeeEstimates
      const gasFee = optionGasFee(option, estimates)
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

function parseGwei(value: string) {
  return ethers.utils.parseUnits(value, 'gwei')
}
