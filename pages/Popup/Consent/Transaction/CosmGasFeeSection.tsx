import { EditIcon } from '@chakra-ui/icons'
import {
  Button,
  ButtonGroup,
  HStack,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Select,
  Stack,
  Text
} from '@chakra-ui/react'
import type { Coin } from 'cosmjs-types/cosmos/base/v1beta1/coin'
import Decimal from 'decimal.js'
import { useEffect, useMemo, useState } from 'react'
import * as React from 'react'

import { AlertBox } from '~components/AlertBox'
import { formatNumber } from '~lib/formatNumber'
import { IChainAccount, INetwork, IToken } from '~lib/schema'
import { useCoinGeckoTokensPrice } from '~lib/services/datasource/coingecko'
import {
  CosmPriceSteps,
  CosmTxFee,
  useCosmTxFees
} from '~lib/services/provider/cosm/hooks'
import { useTokens } from '~lib/services/token'
import { CosmTokenInfo } from '~lib/services/token/cosm'

export const CosmGasFeeSection = ({
  network,
  account,
  gasFee,
  setGasFee,
  gasLimit,
  setGasLimit
}: {
  network: INetwork
  account: IChainAccount
  gasFee?: Coin
  setGasFee: (gasFee: Coin) => void
  gasLimit?: number
  setGasLimit: (gasLimit: number) => void
}) => {
  const txFees = useCosmTxFees(network, gasLimit)
  const { tokens } = useTokens(account)

  const feeTokens = useMemo(() => {
    const tokenMap = new Map(tokens?.map((token) => [token.token, token]))
    return txFees?.map(({ denom }) => tokenMap.get(denom)).filter(Boolean) as
      | IToken[]
      | undefined
  }, [txFees, tokens])

  const { currencySymbol, prices } =
    useCoinGeckoTokensPrice(network, feeTokens) || {}

  const [priceStep, setPriceStep] =
    useState<typeof CosmPriceSteps[number]>('average')
  const [feeDenom, setFeeDenom] = useState<string | undefined>(undefined)
  const [fee, setFee] = useState<CosmTxFee | undefined>(undefined)

  useEffect(() => {
    const txFee = txFees?.find(({ denom }) => denom === gasFee?.denom)
    setFeeDenom((txFee || txFees?.[0])?.denom)
  }, [txFees, gasFee])

  useEffect(() => {
    setFee(txFees?.find(({ denom }) => denom === feeDenom))
  }, [feeDenom, txFees])

  useEffect(() => {
    if (fee) {
      setGasFee({
        denom: fee.denom,
        amount: fee[priceStep].amountParticle
      })
    }
  }, [fee, priceStep, setGasFee])

  const [editGasLimit, setEditGasLimit] = useState(false)

  const insufficientBalance = useMemo(() => {
    const feeToken = feeTokens?.find((token) => token.token === fee?.denom)
    return (
      fee &&
      feeToken &&
      new Decimal(fee[priceStep].amountParticle).greaterThan(
        (feeToken.info as CosmTokenInfo).balance
      )
    )
  }, [fee, feeTokens, priceStep])

  return (
    <>
      <Stack>
        <Text>Fee</Text>

        <ButtonGroup variant="outline" isAttached>
          {CosmPriceSteps.map((step) => {
            const txFeeAmount = fee?.[step]
            const price = fee && prices?.get(fee.denom)
            return (
              <Button
                key={step}
                colorScheme={priceStep === step ? 'purple' : undefined}
                onClick={() => setPriceStep(step)}>
                <Stack align="center">
                  <Text fontWeight="medium">{priceStepTitle(step)}</Text>
                  <Text color="gray.500">
                    {formatNumber(
                      txFeeAmount?.amount,
                      undefined,
                      fee?.decimals
                    )}
                    &nbsp;
                    {fee?.symbol}
                  </Text>
                  <Text color="gray.500">
                    {currencySymbol}&nbsp;
                    {formatNumber(
                      new Decimal(price || 0).mul(txFeeAmount?.amount || 0)
                    )}
                  </Text>
                </Stack>
              </Button>
            )
          })}
        </ButtonGroup>
      </Stack>

      <HStack justify="space-between">
        <Text>Fee Token</Text>

        <Select
          w={64}
          value={feeDenom}
          onChange={(e) => setFeeDenom(e.target.value)}>
          {txFees?.map((txFee) => {
            return (
              <option key={txFee.denom} value={txFee.denom}>
                {txFee.symbol}
              </option>
            )
          })}
        </Select>
      </HStack>

      <HStack justify="space-between">
        <Text>Gas</Text>

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

      {insufficientBalance === true && (
        <AlertBox level="error">
          You do not have enough {fee?.symbol} in your account to pay for
          transaction fees.
        </AlertBox>
      )}
    </>
  )
}

function priceStepTitle(priceStep: typeof CosmPriceSteps[number]) {
  switch (priceStep) {
    case 'low':
      return 'Low'
    case 'average':
      return 'Average'
    case 'high':
      return 'High'
  }
}
