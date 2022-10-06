import { ChevronRightIcon, EditIcon, InfoIcon } from '@chakra-ui/icons'
import { Button, HStack, Stack, Text, Tooltip, chakra } from '@chakra-ui/react'
import Decimal from 'decimal.js'
import * as React from 'react'

import { formatNumber } from '~lib/formatNumber'
import { CryptoComparePrice } from '~lib/services/datasource/cryptocompare'
import { NetworkInfo } from '~lib/services/network'
import {
  GasEstimateType,
  GasFeeEstimates,
  GasFeeEstimation,
  GasOption,
  MaxFeePerGas
} from '~lib/services/provider/evm'

import {
  minWaitTimeColor,
  minWaitTimeText,
  optionIcon,
  optionTitle
} from './EvmGasFeeEditModal'

export const EvmGasFeeEditSection = ({
  networkInfo,
  activeOption,
  onGasFeeEditOpen,
  onAdvancedGasFeeOpen,
  normalFee,
  maxFee,
  gasFeeEstimation,
  customGasFeePerGas,
  siteSuggestedGasFeePerGas,
  increasedGasFeePerGas,
  price
}: {
  networkInfo: NetworkInfo
  activeOption: GasOption
  onGasFeeEditOpen: () => void
  onAdvancedGasFeeOpen: (confirm: boolean) => void
  normalFee?: Decimal
  maxFee?: Decimal
  gasFeeEstimation?: GasFeeEstimation
  customGasFeePerGas?: MaxFeePerGas
  siteSuggestedGasFeePerGas?: MaxFeePerGas
  increasedGasFeePerGas?: MaxFeePerGas
  price?: CryptoComparePrice
}) => {
  const icon = optionIcon(activeOption)

  return (
    <Stack spacing={2}>
      <HStack justify="end">
        <Button
          variant="ghost"
          colorScheme="blue"
          size="sm"
          px={1}
          rightIcon={<ChevronRightIcon fontSize="xl" />}
          onClick={onGasFeeEditOpen}>
          {icon && <>{icon}&nbsp;</>}
          {optionTitle(activeOption, false)}
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
                  Gas fee is paid to miners/validators who process transactions
                  on the Ethereum network. Archmage does not profit from gas
                  fees.
                </Text>
                <Text>
                  Gas fee is set by the network and fluctuate based on network
                  traffic and transaction complexity.
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
        <Text
          color={minWaitTimeColor(activeOption)}
          fontSize="sm"
          fontWeight="medium">
          {gasFeeEstimation?.gasEstimateType === GasEstimateType.FEE_MARKET &&
            minWaitTimeText(
              activeOption,
              gasFeeEstimation.gasFeeEstimates as GasFeeEstimates,
              customGasFeePerGas,
              siteSuggestedGasFeePerGas,
              increasedGasFeePerGas
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
  )
}
