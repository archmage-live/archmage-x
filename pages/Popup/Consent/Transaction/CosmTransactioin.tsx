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
import { StdSignDoc } from '@cosmjs/amino'
import { BiQuestionMark } from '@react-icons/all-files/bi/BiQuestionMark'
import { Coin as CosmCoin } from 'cosmjs-types/cosmos/base/v1beta1/coin'
import { AuthInfo, SignDoc } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import Decimal from 'decimal.js'
import Long from 'long'
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import * as React from 'react'

import { AlertBox } from '~components/AlertBox'
import { SpinningOverlay } from '~components/SpinningOverlay'
import { formatNumber } from '~lib/formatNumber'
import { toCosmSignDoc } from '~lib/inject/cosm'
import { IChainAccount, INetwork, ISubWallet, IWallet } from '~lib/schema'
import { CONSENT_SERVICE, ConsentRequest } from '~lib/services/consentService'
import { useCryptoComparePrice } from '~lib/services/datasource/cryptocompare'
import { NetworkInfo } from '~lib/services/network'
import {
  TransactionPayload,
  formatTxPayload,
  useNonce
} from '~lib/services/provider'
import { useCosmTransaction } from '~lib/services/provider/cosm/hooks'
import { Amount } from '~lib/services/token'
import { TransactionType } from '~lib/services/transaction'
import { useCosmTxInfo } from '~lib/services/transaction/cosmService'
import { isHardwareWallet, isStdSignDoc } from '~lib/wallet'

import { CosmGasFeeSection } from './CosmGasFeeSection'
import {
  CosmTransactionEvents,
  CosmTransactionMessages
} from './CosmTransactionData'
import { FromToWithCheck } from './FromTo'
import { useTabsHeaderScroll } from './helpers'

export const CosmTransaction = ({
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
  const { txParams } = payload as {
    txParams: SignDoc | StdSignDoc
  }

  const [signDoc, setSignDoc] = useState(txParams)

  const txResult = useCosmTransaction(network, account, signDoc)

  const { txInfo, gasFee, gasLimit, sequence, msgs } =
    useCosmTxInfo(network, account, signDoc, txResult?.tx, txResult?.logs) || {}

  const setGasLimit = useCallback((gasLimit: number) => {
    setSignDoc((signDoc) => {
      if (isStdSignDoc(signDoc)) {
        if (signDoc.fee.gas === gasLimit.toString()) {
          return signDoc
        }
        return {
          ...signDoc,
          fee: {
            ...signDoc.fee,
            gas: gasLimit.toString()
          }
        }
      } else {
        const authInfo = AuthInfo.decode(signDoc.authInfoBytes)
        if (authInfo.fee?.gasLimit.equals(gasLimit)) {
          return signDoc
        }
        return {
          ...signDoc,
          authInfoBytes: AuthInfo.encode({
            ...authInfo,
            fee: {
              ...authInfo.fee!,
              gasLimit: Long.fromNumber(gasLimit)
            }
          }).finish()
        }
      }
    })
  }, [])

  const setGasFee = useCallback((gasFee: CosmCoin) => {
    const amount = [gasFee]
    setSignDoc((signDoc) => {
      if (isStdSignDoc(signDoc)) {
        if (signDoc.fee.amount.length === 1) {
          const amt = signDoc.fee.amount[0]
          if (amt.denom === gasFee.denom && amt.amount === gasFee.amount) {
            return signDoc
          }
        }
        return {
          ...signDoc,
          fee: {
            ...signDoc.fee,
            amount
          }
        }
      } else {
        const authInfo = AuthInfo.decode(signDoc.authInfoBytes)
        if (authInfo.fee?.amount.length === 1) {
          const amt = authInfo.fee.amount[0]
          if (amt.denom === gasFee.denom && amt.amount === gasFee.amount) {
            return signDoc
          }
        }
        return {
          ...signDoc,
          authInfoBytes: AuthInfo.encode({
            ...authInfo,
            fee: {
              ...authInfo.fee!,
              amount
            }
          }).finish()
        }
      }
    })
  }, [])

  const [ignoreEstimateError, setIgnoreEstimateError] = useState(false)

  const [editSequenceNumber, setEditSequenceNumber] = useState(false)
  const managedSequence = useNonce(network, account)

  const setSequence = useCallback((sequence: number) => {
    setSignDoc((signDoc) => {
      if (isStdSignDoc(signDoc)) {
        if (signDoc.sequence === sequence.toString()) {
          return signDoc
        }
        return {
          ...signDoc,
          sequence: sequence.toString()
        }
      } else {
        const authInfo = AuthInfo.decode(signDoc.authInfoBytes)
        if (authInfo.signerInfos[0].sequence.equals(sequence)) {
          return signDoc
        }
        return {
          ...signDoc,
          authInfoBytes: AuthInfo.encode({
            ...authInfo,
            signerInfos: [
              {
                ...authInfo.signerInfos[0],
                sequence: Long.fromNumber(sequence)
              }
            ]
          }).finish()
        }
      }
    })
  }, [])

  useEffect(() => {
    if (editSequenceNumber || managedSequence === undefined) {
      return
    }
    setSequence(managedSequence)
  }, [editSequenceNumber, managedSequence, setSequence])

  const bg = useColorModeValue('purple.50', 'gray.800')
  const bannerBg = useColorModeValue('white', 'black')

  const { scrollRef, anchorRef, tabsHeaderSx } = useTabsHeaderScroll()

  const [tabIndex, setTabIndex] = useState(0)

  const [spinning, setSpinning] = useState(false)

  const price = useCryptoComparePrice(networkInfo.currencySymbol)

  const value = useMemo(
    () =>
      txInfo?.amount
        ? new Decimal(txInfo.amount).div(
            new Decimal(10).pow(networkInfo.decimals)
          )
        : undefined,
    [txInfo, networkInfo]
  )

  const onConfirm = useCallback(async () => {
    setSpinning(true)

    const txParams = isStdSignDoc(signDoc) ? signDoc : toCosmSignDoc(signDoc)

    await CONSENT_SERVICE.processRequest(
      {
        ...request,
        payload: {
          txParams
        } as TransactionPayload
      },
      true
    )

    onComplete()
    setSpinning(false)
  }, [request, onComplete, signDoc])

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
            to={txInfo?.to}
          />
        </Box>
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
                {txInfo?.type === TransactionType.Send ? (
                  <Text fontSize="md" color="gray.500">
                    {`${
                      txInfo.name === 'IBC Transfer' ? 'IBC Transfer' : 'Send'
                    } ${networkInfo.currencySymbol}`.toUpperCase()}
                  </Text>
                ) : (
                  <Text fontSize="md" noOfLines={3}>
                    <chakra.span color="blue.500">{txInfo?.name}</chakra.span>
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
          </Stack>

          <Divider />
        </Box>

        <Box ref={anchorRef} w="full" bg={bg} zIndex={1} sx={tabsHeaderSx}>
          <Tabs w="full" px={6} index={tabIndex} onChange={setTabIndex}>
            <TabList>
              <Tab>DETAILS</Tab>
              <Tab>MESSAGES</Tab>
              <Tab>EVENTS</Tab>
            </TabList>
          </Tabs>
        </Box>

        <Stack w="full" px={6} pt={6} spacing={8}>
          <Tabs index={tabIndex}>
            <TabPanels>
              <TabPanel p={0}>
                <Stack spacing={8}>
                  {txInfo?.success === false && (
                    <AlertBox level="error" nowrap>
                      <Text>
                        We were not able to simulate transaction. There might be
                        an error in the module and this transaction may fail.
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

                  <CosmGasFeeSection
                    network={network}
                    account={account}
                    gasFee={gasFee?.[0]}
                    setGasFee={setGasFee}
                    gasLimit={gasLimit}
                    setGasLimit={setGasLimit}
                  />

                  <HStack justify="space-between">
                    <Text>Sequence</Text>

                    {!editSequenceNumber ? (
                      <HStack>
                        <Text>{sequence}</Text>
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
                        value={sequence}
                        onChange={(_, val) => setSequence(val)}>
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    )}
                  </HStack>
                </Stack>
              </TabPanel>
              <TabPanel p={0}>
                <CosmTransactionMessages msgs={msgs} />
              </TabPanel>
              <TabPanel p={0}>
                <CosmTransactionEvents events={txResult?.logs} />
              </TabPanel>
            </TabPanels>
          </Tabs>

          <Divider />

          {isHardwareWallet(wallet.type) && (
            <AlertBox level="info">
              Prior to clicking confirm, you should plug in your hardware wallet
              device and select the Cosmos app.
            </AlertBox>
          )}

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
              isDisabled={txInfo?.success === false && !ignoreEstimateError}
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
