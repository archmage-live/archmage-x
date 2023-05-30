import { EditIcon, InfoIcon } from '@chakra-ui/icons'
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
  useColorModeValue,
  useDisclosure
} from '@chakra-ui/react'
import { BigNumber } from '@ethersproject/bignumber'
import { BiQuestionMark } from '@react-icons/all-files/bi/BiQuestionMark'
import Decimal from 'decimal.js'
import { useScroll } from 'framer-motion'
import * as React from 'react'
import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

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
  useEstimateGasPrice,
  useIsContract,
  useNonce
} from '~lib/services/provider'
import {
  EthGasPriceEstimate,
  EvmTxParams,
  EvmTxPopulatedParams,
  GasEstimateType,
  GasFeeEstimates,
  GasFeeEstimation,
  GasOption,
  MaxFeePerGas,
  formatGwei,
  isSourcedGasFeeEstimates,
  parseGwei,
  useDefaultGasFeeSettings
} from '~lib/services/provider/evm'
import { Amount } from '~lib/services/token'
import { useTransactionDescription } from '~lib/services/transaction/evmService'
import { shortenAddress } from '~lib/utils'
import { isHardwareWallet, isWalletConnectProtocol } from '~lib/wallet'
import { EvmGasFeeEditSection } from '~pages/Popup/Consent/Transaction/EvmGasFeeEditSection'
import {
  WalletConnectSigningModel,
  useWalletConnectSigning
} from '~pages/Popup/Consent/WallectConnectSigningModel'

import { EvmAdvancedGasFeeModal } from './EvmAdvancedGasFeeModal'
import {
  EvmGasFeeEditModal,
  NETWORK_CONGESTION_THRESHOLDS,
  optionGasFee
} from './EvmGasFeeEditModal'
import { EvmTransactionData } from './EvmTransactionData'
import { FromToWithCheck } from './FromTo'
import { useTabsHeaderScroll } from './helpers'

export const EvmTransaction = ({
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
  const payload = request.payload as TransactionPayload
  formatTxPayload(network, payload)

  const txParams = payload.txParams as EvmTxParams
  const populated = payload.populatedParams as EvmTxPopulatedParams
  // useEffect(() => {
  //   console.log('payload:', payload)
  // }, [payload])

  const siteSuggestedGasFeePerGas = useMemo(() => {
    if (!txParams.maxPriorityFeePerGas || !txParams.maxFeePerGas) {
      return
    }
    return {
      maxPriorityFeePerGas: formatGwei(
        (txParams.maxPriorityFeePerGas || populated.maxPriorityFeePerGas)!
      ),
      maxFeePerGas: formatGwei(
        (txParams.maxFeePerGas || populated.maxFeePerGas)!
      )
    } as MaxFeePerGas
  }, [txParams, populated])

  const isContract = useIsContract(network, txParams.to)

  const { signature: functionSig, description } = useTransactionDescription(
    network,
    isContract ? txParams : undefined
  )

  const [ignoreEstimateError, setIgnoreEstimateError] = useState(false)

  const { gasPrice: gasFeeEstimation } = useEstimateGasPrice(
    network,
    15000
  ) as {
    gasPrice: GasFeeEstimation | undefined
  }
  useEffect(() => {
    console.log('gasFeeEstimation:', gasFeeEstimation)
  }, [gasFeeEstimation])

  const [nonce, setNonce] = useState(BigNumber.from(txParams.nonce!).toNumber())
  const [gasLimit, setGasLimit] = useState(
    BigNumber.from(txParams.gasLimit!).toNumber()
  )
  const [editNonce, setEditNonce] = useState(false)
  const [editGasLimit, setEditGasLimit] = useState(false)

  const managedNonce = useNonce(network, account)
  useEffect(() => {
    if (editNonce || managedNonce === undefined) {
      return
    }
    setNonce(managedNonce)
  }, [editNonce, managedNonce])

  const [isGasLimitValid, setIsGasLimitValid] = useState(false)
  useEffect(() => {
    setIsGasLimitValid(gasLimit >= GAS_LIMIT_MIN && gasLimit <= GAS_LIMIT_MAX)
  }, [gasLimit])

  const bg = useColorModeValue('purple.50', 'gray.800')
  const bannerBg = useColorModeValue('white', 'black')

  const { scrollRef, anchorRef, tabsHeaderSx } = useTabsHeaderScroll()

  const [tabIndex, setTabIndex] = useState(0)

  const [spinning, setSpinning] = useState(false)

  const price = useCryptoComparePrice(networkInfo.currencySymbol)

  const {
    defaultGasFeeOption,
    defaultAdvancedGasFee,
    setDefaultAdvancedGasFee
  } = useDefaultGasFeeSettings(network.id)

  const [_activeOption, setActiveOption] = useState<GasOption>()
  useEffect(() => {
    if (siteSuggestedGasFeePerGas) {
      setActiveOption(GasOption.SITE_SUGGESTED)
    }
  }, [siteSuggestedGasFeePerGas])

  const activeOption = _activeOption || defaultGasFeeOption || GasOption.MEDIUM

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

  const [normalFee, maxFee] = useComputeFee(
    gasLimit,
    networkInfo.decimals,
    activeOption,
    gasFeeEstimation,
    customGasFeePerGas,
    siteSuggestedGasFeePerGas
  )

  const value = useComputeValue(
    (txParams.value as BigNumber) || 0,
    networkInfo.decimals
  )

  const normalTotal = normalFee?.add(value)
  const maxTotal = maxFee?.add(value)

  const insufficientBalance = balance && normalTotal?.gt(balance.amount)

  const {
    isWcOpen,
    onWcOpen,
    onWcClose,
    wcPayload,
    setWcPayload,
    onWcSignedRef
  } = useWalletConnectSigning()

  const onConfirm = useCallback(async () => {
    if (!gasFeeEstimation || !activeOption) {
      return
    }

    let maxPriorityFeePerGas, maxFeePerGas, gasPrice
    switch (gasFeeEstimation.gasEstimateType) {
      case GasEstimateType.FEE_MARKET: {
        const estimates = gasFeeEstimation.gasFeeEstimates as GasFeeEstimates
        const gasFee = optionGasFee(
          activeOption,
          estimates,
          customGasFeePerGas,
          siteSuggestedGasFeePerGas
        )
        if (!gasFee) {
          return
        }
        maxPriorityFeePerGas = gasFee.suggestedMaxPriorityFeePerGas
        maxFeePerGas = gasFee.suggestedMaxFeePerGas
        break
      }
      // case GasEstimateType.LEGACY:
      //   return
      case GasEstimateType.ETH_GAS_PRICE: {
        const estimates =
          gasFeeEstimation.gasFeeEstimates as EthGasPriceEstimate
        gasPrice = estimates.gasPrice
        break
      }
    }

    const tx = {
      ...payload.txParams,
      nonce,
      gasLimit,
      gasPrice: gasPrice && parseGwei(gasPrice).toDecimalPlaces(0).toString(),
      maxPriorityFeePerGas:
        maxPriorityFeePerGas &&
        parseGwei(maxPriorityFeePerGas).toDecimalPlaces(0).toString(),
      maxFeePerGas:
        maxFeePerGas && parseGwei(maxFeePerGas).toDecimalPlaces(0).toString()
    } as EvmTxParams

    // trick
    if (
      tx.type === 2 &&
      tx.gasPrice &&
      (!tx.maxPriorityFeePerGas || !tx.maxFeePerGas)
    ) {
      tx.maxPriorityFeePerGas = tx.gasPrice
      tx.maxFeePerGas = tx.gasPrice
      delete tx.gasPrice
    }

    const process = async (signed?: any) => {
      setSpinning(true)

      await CONSENT_SERVICE.processRequest(
        {
          ...request,
          payload: {
            txParams: tx,
            populatedParams: {
              ...payload.populatedParams,
              functionSig
            } as EvmTxPopulatedParams,
            ...signed
          } as TransactionPayload
        },
        true
      )

      onComplete()
      setSpinning(false)
    }

    if (isWalletConnectProtocol(wallet.type)) {
      setWcPayload({ tx })
      onWcSignedRef.current = ({ signedTx, txHash }) => {
        console.log(signedTx, txHash)
        process({ signedTx, txHash })
      }
      onWcOpen()
    } else {
      await process()
    }
  }, [
    gasFeeEstimation,
    activeOption,
    payload,
    nonce,
    gasLimit,
    wallet,
    request,
    functionSig,
    onComplete,
    customGasFeePerGas,
    siteSuggestedGasFeePerGas,
    setWcPayload,
    onWcSignedRef,
    onWcOpen
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
            {origin && <Text>{origin}</Text>}

            <HStack minH="30px">
              {isContract !== undefined && (
                <HStack px={2} py={1} borderRadius="4px" borderWidth="1px">
                  {isContract ? (
                    <>
                      <Text fontSize="md" color="blue.500">
                        {shortenAddress(txParams.to)}
                      </Text>

                      <HStack spacing={1} fontSize="md" color="gray.500">
                        <Text maxW="196px" noOfLines={1}>
                          :&nbsp;
                          {functionSig?.name.toUpperCase() ||
                            'Contract Interaction'.toUpperCase()}
                        </Text>
                        <Tooltip label="We cannot verify this contract. Make sure you trust this address.">
                          <InfoIcon />
                        </Tooltip>
                      </HStack>
                    </>
                  ) : !txParams.to ? (
                    <Text fontSize="md" color="gray.500">
                      {'Deploy Contract'.toUpperCase()}
                    </Text>
                  ) : (
                    <Text fontSize="md" color="gray.500">
                      {`Send ${networkInfo.currencySymbol}`.toUpperCase()}
                    </Text>
                  )}
                </HStack>
              )}
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
          {isContract && (
            <Tabs w="full" px={6} index={tabIndex} onChange={setTabIndex}>
              <TabList>
                <Tab>DETAILS</Tab>
                <Tab>DATA</Tab>
                <Tab>HEX</Tab>
              </TabList>
            </Tabs>
          )}
        </Box>

        <Stack w="full" px={6} pt={6} spacing={8}>
          <Tabs index={tabIndex}>
            <TabPanels>
              <TabPanel p={0}>
                <Stack spacing={16}>
                  <Stack spacing={8}>
                    {isNetworkBusy(gasFeeEstimation) && (
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

                        <EvmGasFeeEditSection
                          networkInfo={networkInfo}
                          activeOption={activeOption}
                          onGasFeeEditOpen={onGasFeeEditOpen}
                          onAdvancedGasFeeOpen={onAdvancedGasFeeOpen}
                          normalFee={normalFee}
                          maxFee={maxFee}
                          gasFeeEstimation={gasFeeEstimation}
                          customGasFeePerGas={customGasFeePerGas}
                          siteSuggestedGasFeePerGas={siteSuggestedGasFeePerGas}
                          price={price}
                        />

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
                <EvmTransactionData tx={txParams} description={description} />
              </TabPanel>
              <TabPanel p={0}>
                <EvmTransactionData
                  tx={txParams}
                  description={description}
                  showHex
                />
              </TabPanel>
            </TabPanels>
          </Tabs>

          <Divider />

          {!isGasLimitValid && (
            <AlertBox level="error">
              Gas limit must be &gt;= {GAS_LIMIT_MIN} and &lt;= {GAS_LIMIT_MAX}
            </AlertBox>
          )}

          {insufficientBalance === true && (
            <AlertBox level="error">
              You do not have enough {networkInfo.currencySymbol} in your
              account to pay for transaction fees on network {networkInfo.name}.
              Buy {networkInfo.currencySymbol} or deposit from another account.
            </AlertBox>
          )}

          {isHardwareWallet(wallet.type) && (
            <AlertBox level="info">
              Prior to clicking confirm, you should plug in your hardware wallet
              device and select the Ethereum app.
            </AlertBox>
          )}

          <HStack justify="center" spacing={12}>
            <Button
              size="lg"
              w={36}
              variant="outline"
              onClick={async () => {
                await CONSENT_SERVICE.processRequest(request, false)
                onComplete()
              }}>
              Reject
            </Button>
            <Button
              size="lg"
              w={36}
              colorScheme="purple"
              isDisabled={
                (populated.code && !ignoreEstimateError) ||
                insufficientBalance !== false ||
                !isGasLimitValid
              }
              onClick={onConfirm}>
              Confirm
            </Button>
          </HStack>

          {suffix}
        </Stack>
      </Box>

      <SpinningOverlay loading={spinning} />

      {gasFeeEstimation?.gasEstimateType === GasEstimateType.FEE_MARKET &&
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
            gasFeeEstimates={
              gasFeeEstimation.gasFeeEstimates as GasFeeEstimates
            }
            customGasFeePerGas={customGasFeePerGas}
            siteSuggestedGasFeePerGas={siteSuggestedGasFeePerGas}
            gasLimit={gasLimit}
            origin={origin || ''}
          />

          <EvmAdvancedGasFeeModal
            network={network}
            isOpen={isAdvancedGasFeeOpen}
            onClose={onAdvancedGasFeeClose}
            closeOnOverlayClick={!isGasFeeEditOpen}
            gasFeeEstimates={
              gasFeeEstimation.gasFeeEstimates as GasFeeEstimates
            }
            customGasFeePerGas={customGasFeePerGas}
            gasLimit={gasLimit}
            currencySymbol={networkInfo.currencySymbol}
          />
        </>
      ) : (
        <></>
      )}

      {isWalletConnectProtocol(wallet.type) && (
        <WalletConnectSigningModel
          isOpen={isWcOpen}
          onClose={onWcClose}
          network={network}
          account={account}
          payload={wcPayload}
          onSigned={onWcSignedRef.current}
        />
      )}
    </>
  )
}

export function useComputeFee(
  gasLimit: number,
  decimals: number,
  option?: GasOption,
  gasFeeEstimation?: GasFeeEstimation,
  customGasFeePerGas?: MaxFeePerGas,
  siteSuggestedGasFeePerGas?: MaxFeePerGas,
  increasedGasFeePerGas?: MaxFeePerGas
) {
  const [normalFee, maxFee] =
    useMemo(() => {
      if (!option || !gasFeeEstimation) {
        return
      }

      let normalFee, maxFee
      switch (gasFeeEstimation.gasEstimateType) {
        case GasEstimateType.FEE_MARKET: {
          const estimates = gasFeeEstimation.gasFeeEstimates as GasFeeEstimates
          const gasFee = optionGasFee(
            option,
            estimates,
            customGasFeePerGas,
            siteSuggestedGasFeePerGas,
            increasedGasFeePerGas
          )
          if (!gasFee) {
            return
          }
          maxFee = parseGwei(gasFee.suggestedMaxFeePerGas)
          normalFee = parseGwei(estimates.estimatedBaseFee).add(
            parseGwei(gasFee.suggestedMaxPriorityFeePerGas)
          )
          break
        }
        // case GasEstimateType.LEGACY: {
        //   const estimates = gasFeeEstimation.gasFeeEstimates as LegacyGasPriceEstimate
        //   return
        // }
        case GasEstimateType.ETH_GAS_PRICE: {
          const estimates =
            gasFeeEstimation.gasFeeEstimates as EthGasPriceEstimate
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
          .mul(gasLimit)
          .div(new Decimal(10).pow(decimals)),
        new Decimal(maxFee.toString())
          .mul(gasLimit)
          .div(new Decimal(10).pow(decimals))
      ]
    }, [
      decimals,
      gasFeeEstimation,
      gasLimit,
      option,
      customGasFeePerGas,
      siteSuggestedGasFeePerGas,
      increasedGasFeePerGas
    ]) || []
  return [normalFee, maxFee]
}

function useComputeValue(value: BigNumber | number, decimals: number) {
  return useMemo(
    () => new Decimal(value.toString()).div(new Decimal(10).pow(decimals)),
    [value, decimals]
  )
}

function isNetworkBusy(gasFeeEstimation?: GasFeeEstimation) {
  if (gasFeeEstimation?.gasEstimateType !== GasEstimateType.FEE_MARKET) {
    return
  }
  const estimates = gasFeeEstimation.gasFeeEstimates as GasFeeEstimates
  if (!isSourcedGasFeeEstimates(estimates)) {
    return
  }

  return estimates.networkCongestion >= NETWORK_CONGESTION_THRESHOLDS.BUSY
}

const GAS_LIMIT_MIN = 21000
const GAS_LIMIT_MAX = 7920027
