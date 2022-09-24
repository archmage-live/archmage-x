import { ArrowDownIcon, ArrowUpIcon, InfoIcon } from '@chakra-ui/icons'
import {
  Button,
  Center,
  Divider,
  FormControl,
  FormLabel,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Stack,
  Text,
  Tooltip,
  chakra
} from '@chakra-ui/react'
import { BigNumber } from '@ethersproject/bignumber'
import Decimal from 'decimal.js'
import * as React from 'react'
import { useEffect, useState } from 'react'

import { AlertBox, AlertLevel } from '~components/AlertBox'
import {
  GasFeeEstimates,
  isSourcedGasFeeEstimates
} from '~lib/services/provider/evm'

import { GasFeePerGas } from './EvmGasFeeEditModal'

export const EvmAdvancedGasFeeModal = ({
  isOpen,
  onClose,
  closeOnOverlayClick,
  gasFeeEstimates,
  customGasFeePerGas,
  gasLimit,
  currencySymbol
}: {
  isOpen: boolean
  onClose: (customGasFeePerGas?: GasFeePerGas) => void
  closeOnOverlayClick: boolean
  gasFeeEstimates: GasFeeEstimates
  customGasFeePerGas?: GasFeePerGas
  gasLimit: BigNumber
  currencySymbol: string
}) => {
  const [maxBaseFeePerGas, setMaxBaseFeePerGas] = useState<string>('')
  const [maxPriorityFeePerGas, setMaxPriorityFeePerGas] = useState<string>('')

  useEffect(() => {
    const maxFee =
      customGasFeePerGas?.maxFeePerGas ||
      gasFeeEstimates.medium.suggestedMaxFeePerGas
    const maxPriorityFee =
      customGasFeePerGas?.maxPriorityFeePerGas ||
      gasFeeEstimates.medium.suggestedMaxPriorityFeePerGas
    if (maxFee && maxPriorityFee) {
      setMaxBaseFeePerGas(new Decimal(maxFee).sub(maxPriorityFee).toString())
      setMaxPriorityFeePerGas(maxPriorityFee)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const [baseFeeAlert, setBaseFeeAlert] = useState('')
  const [baseFeeAlertLevel, setBaseFeeAlertLevel] =
    useState<AlertLevel>('warning')
  const [priorityFeeAlert, setPriorityFeeAlert] = useState('')
  const [priorityFeeAlertLevel, setPriorityFeeAlertLevel] =
    useState<AlertLevel>('warning')
  const [confirmEnabled, setConfirmEnabled] = useState(false)

  useEffect(() => {
    let confirmEnabled = true

    const baseFee = new Decimal(maxBaseFeePerGas || 0)
    const priorityFee = new Decimal(maxPriorityFeePerGas || 0)

    if (!maxBaseFeePerGas) {
      setBaseFeeAlert('')
      confirmEnabled = false
    } else {
      if (baseFee.lt(maxPriorityFeePerGas || 0)) {
        setBaseFeeAlert('Max base fee cannot be lower than priority fee')
        setBaseFeeAlertLevel('error')
        confirmEnabled = false
      } else if (
        baseFee.add(priorityFee).lt(gasFeeEstimates.low.suggestedMaxFeePerGas)
      ) {
        setBaseFeeAlert('Max base fee is low for current network conditions')
        setBaseFeeAlertLevel('warning')
      } else if (
        baseFee
          .add(priorityFee)
          .gt(
            new Decimal(gasFeeEstimates.high.suggestedMaxFeePerGas).mul(
              HIGH_FEE_WARNING_MULTIPLIER
            )
          )
      ) {
        setBaseFeeAlert('Max base fee is higher than necessary')
        setBaseFeeAlertLevel('warning')
      } else {
        setBaseFeeAlert('')
      }
    }

    if (!maxPriorityFeePerGas) {
      setPriorityFeeAlert('')
      confirmEnabled = false
    } else {
      if (!priorityFee.gt(0)) {
        setPriorityFeeAlert('Priority fee must be greater than 0')
        setPriorityFeeAlertLevel('error')
        confirmEnabled = false
      } else if (
        priorityFee.lt(gasFeeEstimates.low.suggestedMaxPriorityFeePerGas)
      ) {
        setPriorityFeeAlert(
          'Priority fee is low for current network conditions'
        )
        setPriorityFeeAlertLevel('warning')
      } else if (
        priorityFee.gt(
          new Decimal(gasFeeEstimates.high.suggestedMaxPriorityFeePerGas).mul(
            HIGH_FEE_WARNING_MULTIPLIER
          )
        )
      ) {
        setPriorityFeeAlert(
          'Priority fee is higher than necessary. You may pay more than needed'
        )
        setPriorityFeeAlertLevel('warning')
      } else {
        setPriorityFeeAlert('')
      }
    }

    setConfirmEnabled(confirmEnabled)
  }, [isOpen, gasFeeEstimates, maxBaseFeePerGas, maxPriorityFeePerGas])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeOnOverlayClick={closeOnOverlayClick}
      isCentered
      size="lg"
      scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent my={0}>
        <ModalHeader>Advanced gas fee</ModalHeader>
        <ModalCloseButton />
        <ModalBody p={0}>
          <Stack px={6} pb={6} spacing={12} fontSize="sm">
            <Stack spacing={4}>
              <Divider />

              <Stack>
                <FormControl isInvalid={baseFeeAlertLevel === 'error'}>
                  <FormLabel>
                    Max base fee&nbsp;
                    <chakra.span fontWeight="normal">(Gwei)</chakra.span>
                    &nbsp;
                    <Tooltip label="When your transaction gets included in the block, any difference between your max base fee and the actual base fee will be refunded. Total amount is calculated as max base fee (in GWEI) * gas limit.">
                      <InfoIcon />
                    </Tooltip>
                  </FormLabel>

                  <NumberInput
                    position="relative"
                    min={0}
                    keepWithinRange
                    allowMouseWheel
                    value={maxBaseFeePerGas}
                    onChange={(str, num) => {
                      if (Number.isNaN(num)) {
                        setMaxBaseFeePerGas('')
                      } else {
                        const d = new Decimal(str.trim())
                        if (d.decimalPlaces() > 9) {
                          setMaxBaseFeePerGas(d.toDecimalPlaces(9).toString())
                        } else {
                          setMaxBaseFeePerGas(str.trim())
                        }
                      }
                    }}>
                    <HStack
                      position="absolute"
                      right="45px"
                      w="50%"
                      h="full"
                      justify="end">
                      <Text>
                        ≈&nbsp;
                        {new Decimal(maxBaseFeePerGas || 0)
                          .mul(gasLimit.toString())
                          .div(new Decimal(10).pow(9))
                          .toDecimalPlaces(8)
                          .toString()}
                        &nbsp;
                        {currencySymbol}
                      </Text>
                    </HStack>
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>

                <AlertBox level={baseFeeAlertLevel}>{baseFeeAlert}</AlertBox>

                {isSourcedGasFeeEstimates(gasFeeEstimates) && (
                  <HStack justify="space-between" fontSize="sm">
                    <Text maxW="50%-7px">
                      <chakra.span fontWeight="medium">Current:</chakra.span>
                      &nbsp;
                      <chakra.span>
                        {new Decimal(gasFeeEstimates.estimatedBaseFee)
                          .toDecimalPlaces(2)
                          .toString()}
                        &nbsp;Gwei
                      </chakra.span>
                      &nbsp;
                      {gasFeeEstimates.baseFeeTrend === 'up' ? (
                        <ArrowUpIcon color="green.500" fontWeight="medium" />
                      ) : gasFeeEstimates.baseFeeTrend === 'down' ? (
                        <ArrowDownIcon color="red.500" fontWeight="medium" />
                      ) : (
                        <></>
                      )}
                    </Text>
                    <Text maxW="50%-7px">
                      <chakra.span fontWeight="medium">12hr:</chakra.span>
                      &nbsp;
                      <chakra.span>
                        {new Decimal(gasFeeEstimates.historicalBaseFeeRange[0])
                          .toDecimalPlaces(2)
                          .toString()}
                        &nbsp;-&nbsp;
                        {new Decimal(gasFeeEstimates.historicalBaseFeeRange[1])
                          .toDecimalPlaces(2)
                          .toString()}
                        &nbsp;Gwei
                      </chakra.span>
                    </Text>
                  </HStack>
                )}
              </Stack>

              <Stack>
                <FormControl isInvalid={priorityFeeAlertLevel === 'error'}>
                  <FormLabel>
                    Priority fee&nbsp;
                    <chakra.span fontWeight="normal">(Gwei)</chakra.span>
                    &nbsp;
                    <Tooltip label="Priority fee (aka “miner tip”) goes directly to miners and incentivizes them to prioritize your transaction.">
                      <InfoIcon />
                    </Tooltip>
                  </FormLabel>

                  <NumberInput
                    position="relative"
                    min={0}
                    keepWithinRange
                    allowMouseWheel
                    value={maxPriorityFeePerGas}
                    onChange={(str, num) => {
                      if (Number.isNaN(num)) {
                        setMaxPriorityFeePerGas('')
                      } else {
                        const d = new Decimal(str.trim())
                        if (d.decimalPlaces() > 9) {
                          setMaxPriorityFeePerGas(
                            d.toDecimalPlaces(9).toString()
                          )
                        } else {
                          setMaxPriorityFeePerGas(str.trim())
                        }
                      }
                    }}>
                    <HStack
                      position="absolute"
                      right="45px"
                      w="50%"
                      h="full"
                      justify="end">
                      <Text>
                        ≈&nbsp;
                        {new Decimal(maxPriorityFeePerGas || 0)
                          .mul(gasLimit.toString())
                          .div(new Decimal(10).pow(9))
                          .toDecimalPlaces(8)
                          .toString()}
                        &nbsp;
                        {currencySymbol}
                      </Text>
                    </HStack>
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>

                <AlertBox level={priorityFeeAlertLevel}>
                  {priorityFeeAlert}
                </AlertBox>

                {isSourcedGasFeeEstimates(gasFeeEstimates) && (
                  <HStack justify="space-between" fontSize="sm">
                    <Text maxW="50%-7px">
                      <chakra.span fontWeight="medium">Current:</chakra.span>
                      &nbsp;
                      <chakra.span>
                        {new Decimal(gasFeeEstimates.latestPriorityFeeRange[0])
                          .toDecimalPlaces(2)
                          .toString()}
                        &nbsp;-&nbsp;
                        {new Decimal(gasFeeEstimates.latestPriorityFeeRange[1])
                          .toDecimalPlaces(2)
                          .toString()}
                        &nbsp;Gwei
                      </chakra.span>
                      &nbsp;
                      {gasFeeEstimates.priorityFeeTrend === 'up' ? (
                        <ArrowUpIcon color="green.500" fontWeight="medium" />
                      ) : gasFeeEstimates.baseFeeTrend === 'down' ? (
                        <ArrowDownIcon color="red.500" fontWeight="medium" />
                      ) : (
                        <></>
                      )}
                    </Text>
                    <Text maxW="50%-7px">
                      <chakra.span fontWeight="medium">12hr:</chakra.span>
                      &nbsp;
                      <chakra.span>
                        {new Decimal(
                          gasFeeEstimates.historicalPriorityFeeRange[0]
                        )
                          .toDecimalPlaces(2)
                          .toString()}
                        &nbsp;-&nbsp;
                        {new Decimal(
                          gasFeeEstimates.historicalPriorityFeeRange[1]
                        )
                          .toDecimalPlaces(2)
                          .toString()}
                        &nbsp;Gwei
                      </chakra.span>
                    </Text>
                  </HStack>
                )}
              </Stack>
            </Stack>

            <HStack justify="center" spacing={12}>
              <Button
                size="lg"
                w={36}
                variant="outline"
                onClick={() => onClose()}>
                Cancel
              </Button>
              <Button
                size="lg"
                w={36}
                colorScheme="purple"
                isDisabled={!confirmEnabled}
                onClick={() =>
                  onClose({
                    maxPriorityFeePerGas,
                    maxFeePerGas: new Decimal(maxBaseFeePerGas)
                      .add(maxPriorityFeePerGas)
                      .toString()
                  })
                }>
                Confirm
              </Button>
            </HStack>
          </Stack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

const HIGH_FEE_WARNING_MULTIPLIER = 1.5
