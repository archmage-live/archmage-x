import {
  Button,
  Divider,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  chakra,
  useDisclosure
} from '@chakra-ui/react'
import { shallowCopy } from '@ethersproject/properties'
import Decimal from 'decimal.js'
import { BigNumber } from 'ethers'
import * as React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useActiveAccount } from '~lib/active'
import { INetwork, IPendingTx } from '~lib/schema'
import { useCryptoComparePrice } from '~lib/services/datasource/cryptocompare'
import { getNetworkInfo } from '~lib/services/network'
import { useEstimateGas, useEstimateGasPrice } from '~lib/services/provider'
import {
  EthGasPriceEstimate,
  GasEstimateType,
  GasFeeEstimates,
  GasFeeEstimation,
  GasOption,
  MaxFeePerGas,
  formatGwei,
  parseGwei,
  useDefaultGasFeeSettings
} from '~lib/services/provider/evm'
import {
  EVM_TRANSACTION_SERVICE,
  EvmErc4337PendingTxInfo,
  EvmPendingTxInfo,
  isEvmTransactionResponse,
  isEvmUserOperationResponse
} from '~lib/services/transaction/evmService'
import { EvmAdvancedGasFeeModal } from '~pages/Popup/Consent/Transaction/EvmAdvancedGasFeeModal'
import {
  EvmGasFeeEditModal,
  optionGasFee
} from '~pages/Popup/Consent/Transaction/EvmGasFeeEditModal'
import { EvmGasFeeEditSection } from '~pages/Popup/Consent/Transaction/EvmGasFeeEditSection'

import { useComputeFee } from '../Consent/Transaction/EvmTransaction'

export const EvmSpeedUpOrCancelModal = ({
  isOpen,
  onClose,
  network,
  tx,
  isSpeedUp
}: {
  isOpen: boolean
  onClose: () => void
  network: INetwork
  tx: IPendingTx
  isSpeedUp: boolean
}) => {
  const account = useActiveAccount()
  const networkInfo = getNetworkInfo(network)

  const info = tx.info as EvmPendingTxInfo | EvmErc4337PendingTxInfo

  const price = useCryptoComparePrice(networkInfo.currencySymbol)

  const [gasLimit, setGasLimit] = useState(
    isEvmTransactionResponse(info.tx)
      ? BigNumber.from(info.tx.gasLimit).toNumber()
      : isEvmUserOperationResponse(info.tx)
      ? BigNumber.from(info.tx.callGasLimit)
          .add(info.tx.verificationGasLimit)
          .add(info.tx.preVerificationGas)
          .toNumber()
      : 0
  )

  const { gasPrice: gasFeeEstimation } = useEstimateGasPrice(
    network,
    account,
    15000
  ) as {
    gasPrice: GasFeeEstimation | undefined
  }

  const {
    defaultGasFeeOption,
    defaultAdvancedGasFee,
    setDefaultAdvancedGasFee
  } = useDefaultGasFeeSettings(network.id)

  const [_activeOption, setActiveOption] = useState<GasOption>()
  const activeOption = _activeOption || defaultGasFeeOption || GasOption.MEDIUM

  const increasedGasFeePerGas = useMemo(() => {
    if (!info.tx.maxPriorityFeePerGas || !info.tx.maxFeePerGas) {
      return
    }
    return {
      maxPriorityFeePerGas: new Decimal(
        formatGwei(info.tx.maxPriorityFeePerGas)
      )
        .mul(1.1)
        .toString(),
      maxFeePerGas: new Decimal(formatGwei(info.tx.maxFeePerGas))
        .mul(1.1)
        .toString()
    } as MaxFeePerGas
  }, [info])

  useEffect(() => {
    if (!increasedGasFeePerGas || !gasFeeEstimation) {
      return
    }
    const estimates = gasFeeEstimation.gasFeeEstimates as GasFeeEstimates
    if (
      new Decimal(estimates.medium.suggestedMaxPriorityFeePerGas).lt(
        increasedGasFeePerGas.maxPriorityFeePerGas
      ) &&
      new Decimal(estimates.medium.suggestedMaxFeePerGas).lt(
        increasedGasFeePerGas.maxFeePerGas
      )
    ) {
      setActiveOption(GasOption.TEN_PERCENT_INCREASE)
    }
  }, [gasFeeEstimation, increasedGasFeePerGas])

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
    undefined,
    increasedGasFeePerGas
  )

  const txParams = useMemo(() => {
    if (!account) {
      return
    }

    const txParams = shallowCopy(info.request)

    if (!isSpeedUp) {
      // cancel tx
      txParams.to = account.address
      delete txParams.data
      delete txParams.value
    }
    return txParams
  }, [account, info, isSpeedUp])

  const estimatedGasLimit = useEstimateGas(network, account, txParams)
  useEffect(() => {
    if (estimatedGasLimit) {
      setGasLimit(BigNumber.from(estimatedGasLimit).toNumber())
    }
  }, [estimatedGasLimit])

  const [isLoading, setIsLoading] = useState(false)

  const onSubmit = useCallback(async () => {
    if (!account || !gasFeeEstimation || !activeOption || !txParams) {
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
          undefined,
          increasedGasFeePerGas
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

    setIsLoading(true)

    const tx = {
      ...txParams,
      gasLimit,
      gasPrice: gasPrice && parseGwei(gasPrice).toDecimalPlaces(0).toString(),
      maxPriorityFeePerGas:
        maxPriorityFeePerGas &&
        parseGwei(maxPriorityFeePerGas).toDecimalPlaces(0).toString(),
      maxFeePerGas:
        maxFeePerGas && parseGwei(maxFeePerGas).toDecimalPlaces(0).toString()
    }

    console.log(isSpeedUp ? 'Speed up tx:' : 'Cancel tx:', tx)
    // TODO: handle exception
    await EVM_TRANSACTION_SERVICE.signAndSendTx(
      account,
      tx,
      isSpeedUp ? info.origin : undefined,
      info.functionSig,
      true
    )

    setIsLoading(false)
  }, [
    account,
    activeOption,
    customGasFeePerGas,
    gasFeeEstimation,
    gasLimit,
    increasedGasFeePerGas,
    info,
    isSpeedUp,
    txParams
  ])

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        isCentered
        size="lg"
        scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent my={0}>
          <ModalHeader>{isSpeedUp ? '🚀 Speed Up' : '❌ Cancel'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Stack spacing={12}>
              <Stack spacing={6}>
                <Stack>
                  <Text>
                    This gas fee will&nbsp;
                    <chakra.span fontWeight="bold"> replace</chakra.span>
                    &nbsp;the original.
                  </Text>

                  <Divider />
                </Stack>

                <EvmGasFeeEditSection
                  networkInfo={networkInfo}
                  activeOption={activeOption}
                  onGasFeeEditOpen={onGasFeeEditOpen}
                  onAdvancedGasFeeOpen={onAdvancedGasFeeOpen}
                  normalFee={normalFee}
                  maxFee={maxFee}
                  gasFeeEstimation={gasFeeEstimation}
                  customGasFeePerGas={customGasFeePerGas}
                  increasedGasFeePerGas={increasedGasFeePerGas}
                  price={price}
                />
              </Stack>

              <Button
                colorScheme="purple"
                isDisabled={!gasFeeEstimation}
                isLoading={isLoading}
                onClick={async () => {
                  await onSubmit()
                  onClose()
                }}>
                Submit
              </Button>
            </Stack>
          </ModalBody>
        </ModalContent>
      </Modal>

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
            increasedGasFeePerGas={increasedGasFeePerGas}
            gasLimit={gasLimit}
            origin={info.origin || ''}
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
    </>
  )
}
