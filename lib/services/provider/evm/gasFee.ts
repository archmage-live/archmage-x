import { BigNumber } from '@ethersproject/bignumber'
import Decimal from 'decimal.js'
import { ethers } from 'ethers'

import { CODEFI_GAS_API } from '~lib/services/datasource/codefi'

import { EvmProvider } from './'

const MAX_NUMBER_OF_BLOCKS_PER_ETH_FEE_HISTORY_CALL = 1024

type ExistingFeeHistoryBlock = {
  number: number
  baseFeePerGas: BigNumber
  gasUsedRatio: number
  priorityFeeByPercentile: Record<number, BigNumber>
}

type NextFeeHistoryBlock = {
  number: number
  baseFeePerGas: BigNumber
}

type FeeHistoryBlock = ExistingFeeHistoryBlock | NextFeeHistoryBlock

async function fetchBlockFeeHistory({
  provider,
  numberOfBlocks: givenNumberOfBlocks,
  endBlock: givenEndBlock = 'latest',
  percentiles: givenPercentiles = [],
  includeNextBlock
}: {
  provider: EvmProvider
  numberOfBlocks: number
  endBlock?: number | 'latest'
  percentiles?: readonly number[]
  includeNextBlock?: boolean
}): Promise<FeeHistoryBlock[]> {
  const percentiles =
    givenPercentiles.length > 0
      ? Array.from(new Set(givenPercentiles)).sort((a, b) => a - b)
      : []

  const endBlock =
    givenEndBlock === 'latest'
      ? (await provider.getBlock(givenEndBlock)).number
      : givenEndBlock

  const totalNumberOfBlocks =
    endBlock < givenNumberOfBlocks ? endBlock : givenNumberOfBlocks

  const specifiers = []
  for (
    let chunkStartBlock = endBlock - totalNumberOfBlocks;
    chunkStartBlock < endBlock;
    chunkStartBlock += MAX_NUMBER_OF_BLOCKS_PER_ETH_FEE_HISTORY_CALL
  ) {
    const numberOfBlocks = Math.min(
      endBlock - chunkStartBlock,
      MAX_NUMBER_OF_BLOCKS_PER_ETH_FEE_HISTORY_CALL
    )
    const chunkEndBlock = chunkStartBlock + numberOfBlocks
    specifiers.push({ numberOfBlocks, endBlock: chunkEndBlock })
  }

  const chunkedFeeHistory = await Promise.all(
    specifiers.map(async ({ numberOfBlocks, endBlock }, i) => {
      const feeHistory = await provider.getFeeHistory(
        numberOfBlocks,
        endBlock,
        percentiles
      )

      if (
        !feeHistory.baseFeePerGas?.length ||
        !feeHistory.gasUsedRatio.length ||
        !feeHistory.reward?.length
      ) {
        return []
      }

      const startBlock = feeHistory.oldestBlock

      // Per
      // <https://github.com/ethereum/go-ethereum/blob/57a3fab8a75eeb9c2f4fab770b73b51b9fe672c5/eth/gasprice/feehistory.go#L191-L192>,
      // baseFeePerGas will always include an extra item which is the calculated base fee for the
      // next (future) block. We may or may not care about this; if we don't, chop it off.
      const baseFeePerGas =
        i === specifiers.length - 1 && includeNextBlock
          ? feeHistory.baseFeePerGas
          : feeHistory.baseFeePerGas.slice(0, numberOfBlocks)

      // Chain is allowed to return fewer number of block results
      const numberOfExistingResults = feeHistory.gasUsedRatio.length

      return baseFeePerGas.map((baseFeePerGas, index) => {
        const number = startBlock + index

        if (index >= numberOfExistingResults) {
          return { number, baseFeePerGas } as NextFeeHistoryBlock
        }

        const gasUsedRatio = feeHistory.gasUsedRatio[index]

        const priorityFeeForEachPercentile = feeHistory.reward?.[index]
        if (!priorityFeeForEachPercentile?.length) {
          throw new Error(`getFeeHistory invalid reward: ${feeHistory.reward}`)
        }
        const priorityFeeByPercentile: Record<number, BigNumber> = {}
        percentiles.forEach((percentile, i) => {
          priorityFeeByPercentile[percentile] = priorityFeeForEachPercentile[i]
        })

        return {
          number,
          baseFeePerGas,
          gasUsedRatio,
          priorityFeeByPercentile
        } as ExistingFeeHistoryBlock
      })
    })
  )

  return chunkedFeeHistory.reduce((array, chunked) => [...array, ...chunked])
}

const PRIORITY_LEVELS = ['low', 'medium', 'high'] as const
const PRIORITY_LEVEL_PERCENTILES = [10, 20, 30] as const

type PriorityLevel = typeof PRIORITY_LEVELS[number]
type Percentile = typeof PRIORITY_LEVEL_PERCENTILES[number]

const SETTINGS_BY_PRIORITY_LEVEL = {
  low: {
    percentile: 10 as Percentile,
    baseFeePercentageMultiplier: 110,
    priorityFeePercentageMultiplier: 94,
    minSuggestedMaxPriorityFeePerGas: 1_000_000_000,
    estimatedWaitTimes: {
      minWaitTimeEstimate: 15_000,
      maxWaitTimeEstimate: 30_000
    }
  },
  medium: {
    percentile: 20 as Percentile,
    baseFeePercentageMultiplier: 120,
    priorityFeePercentageMultiplier: 97,
    minSuggestedMaxPriorityFeePerGas: 1_500_000_000,
    estimatedWaitTimes: {
      minWaitTimeEstimate: 15_000,
      maxWaitTimeEstimate: 45_000
    }
  },
  high: {
    percentile: 30 as Percentile,
    baseFeePercentageMultiplier: 125,
    priorityFeePercentageMultiplier: 98,
    minSuggestedMaxPriorityFeePerGas: 2_000_000_000,
    estimatedWaitTimes: {
      minWaitTimeEstimate: 15_000,
      maxWaitTimeEstimate: 60_000
    }
  }
}

export type Eip1559GasFee = {
  minWaitTimeEstimate: number // a time duration in milliseconds
  maxWaitTimeEstimate: number // a time duration in milliseconds
  suggestedMaxPriorityFeePerGas: string // a GWEI decimal number
  suggestedMaxFeePerGas: string // a GWEI decimal number
}

export type SourcedGasFeeEstimates = {
  low: Eip1559GasFee
  medium: Eip1559GasFee
  high: Eip1559GasFee
  estimatedBaseFee: string
  historicalBaseFeeRange: [string, string]
  baseFeeTrend: 'up' | 'down' | 'level'
  latestPriorityFeeRange: [string, string]
  historicalPriorityFeeRange: [string, string]
  priorityFeeTrend: 'up' | 'down' | 'level'
  networkCongestion: number
}

export type FallbackGasFeeEstimates = {
  low: Eip1559GasFee
  medium: Eip1559GasFee
  high: Eip1559GasFee
}

export type GasFeeEstimates = SourcedGasFeeEstimates | FallbackGasFeeEstimates

export function isSourcedGasFeeEstimates(
  estimates: GasFeeEstimates
): estimates is SourcedGasFeeEstimates {
  return !!(estimates as SourcedGasFeeEstimates).estimatedBaseFee
}

function calculateGasFeeEstimatesForPriorityLevels(
  feeHistory: FeeHistoryBlock[]
): Pick<GasFeeEstimates, PriorityLevel> {
  const gasFeeEstimates = {} as Pick<GasFeeEstimates, PriorityLevel>

  PRIORITY_LEVELS.forEach((priorityLevel) => {
    const settings = SETTINGS_BY_PRIORITY_LEVEL[priorityLevel]

    const latestBaseFeePerGas = feeHistory[feeHistory.length - 1].baseFeePerGas

    const adjustedBaseFee = latestBaseFeePerGas
      .mul(settings.baseFeePercentageMultiplier)
      .div(100)

    const priorityFees = feeHistory
      .map((block) => {
        return (block as ExistingFeeHistoryBlock).priorityFeeByPercentile?.[
          settings.percentile
        ]
      })
      .filter(BigNumber.isBigNumber)
    const medianPriorityFee = medianOf(priorityFees)
    const adjustedPriorityFee = medianPriorityFee
      .mul(settings.priorityFeePercentageMultiplier)
      .div(100)
    const suggestedMaxPriorityFeePerGas = adjustedPriorityFee.gt(
      settings.minSuggestedMaxPriorityFeePerGas
    )
      ? adjustedPriorityFee
      : settings.minSuggestedMaxPriorityFeePerGas

    const suggestedMaxFeePerGas = adjustedBaseFee.add(
      suggestedMaxPriorityFeePerGas
    )

    gasFeeEstimates[priorityLevel] = {
      ...settings.estimatedWaitTimes,
      suggestedMaxPriorityFeePerGas: ethers.utils.formatUnits(
        suggestedMaxPriorityFeePerGas,
        'gwei'
      ),
      suggestedMaxFeePerGas: ethers.utils.formatUnits(
        suggestedMaxFeePerGas,
        'gwei'
      )
    }
  })

  return gasFeeEstimates
}

async function fetchGasFeeEstimatesViaFeeHistory(
  provider: EvmProvider
): Promise<GasFeeEstimates> {
  const latestBlock = await provider.getBlock('latest')
  const feeHistory = await fetchBlockFeeHistory({
    provider,
    endBlock: latestBlock.number,
    numberOfBlocks: 5,
    percentiles: PRIORITY_LEVEL_PERCENTILES
  })

  const estimatedBaseFee = ethers.utils.formatUnits(
    latestBlock.baseFeePerGas!,
    'gwei'
  )

  const gasFeeEstimatesForPriorityLevels =
    calculateGasFeeEstimatesForPriorityLevels(feeHistory)

  return {
    ...gasFeeEstimatesForPriorityLevels,
    estimatedBaseFee
  }
}

export type EstimatedGasFeeTimeBounds = {
  lowerTimeBound?: number
  upperTimeBound?: number
}

export function calculateTimeEstimate(
  maxPriorityFeePerGas: string,
  maxFeePerGas: string,
  gasFeeEstimates: GasFeeEstimates
): EstimatedGasFeeTimeBounds {
  const { low, medium, high } = gasFeeEstimates
  const estimatedBaseFee =
    (gasFeeEstimates as SourcedGasFeeEstimates).estimatedBaseFee || 0

  let effectiveMaxPriorityFee = new Decimal(maxFeePerGas).sub(estimatedBaseFee)
  if (effectiveMaxPriorityFee.gt(maxPriorityFeePerGas)) {
    effectiveMaxPriorityFee = new Decimal(maxPriorityFeePerGas)
  }

  if (effectiveMaxPriorityFee.lt(low.suggestedMaxPriorityFeePerGas)) {
    return {
      lowerTimeBound: undefined,
      upperTimeBound: undefined
    }
  } else if (effectiveMaxPriorityFee.lt(medium.suggestedMaxPriorityFeePerGas)) {
    return {
      lowerTimeBound: low.minWaitTimeEstimate,
      upperTimeBound: low.maxWaitTimeEstimate
    }
  } else if (effectiveMaxPriorityFee.lt(high.suggestedMaxPriorityFeePerGas)) {
    return {
      lowerTimeBound: medium.minWaitTimeEstimate,
      upperTimeBound: medium.maxWaitTimeEstimate
    }
  } else if (effectiveMaxPriorityFee.eq(high.suggestedMaxPriorityFeePerGas)) {
    return {
      lowerTimeBound: high.minWaitTimeEstimate,
      upperTimeBound: high.maxWaitTimeEstimate
    }
  } else {
    return {
      lowerTimeBound: 0,
      upperTimeBound: high.maxWaitTimeEstimate
    }
  }
}

export type LegacyGasPriceEstimate = {
  low: string
  medium: string
  high: string
}

export type EthGasPriceEstimate = {
  gasPrice: string
}

export enum GasEstimateType {
  FEE_MARKET = 'fee_market',
  LEGACY = 'legacy',
  ETH_GAS_PRICE = 'eth_gasPrice'
}

export type GasFeeEstimation = {
  gasFeeEstimates:
    | GasFeeEstimates
    | LegacyGasPriceEstimate
    | EthGasPriceEstimate
  estimatedGasFeeTimeBounds?: EstimatedGasFeeTimeBounds
  gasEstimateType: GasEstimateType
}

export function getEvmGasFeeBrief({
  gasFeeEstimates,
  gasEstimateType
}: GasFeeEstimation): string {
  let fee: string
  switch (gasEstimateType) {
    case GasEstimateType.FEE_MARKET: {
      const estimates = gasFeeEstimates as GasFeeEstimates
      fee = estimates.medium.suggestedMaxFeePerGas
      break
    }
    case GasEstimateType.LEGACY: {
      const estimates = gasFeeEstimates as LegacyGasPriceEstimate
      fee = estimates.medium
      break
    }
    case GasEstimateType.ETH_GAS_PRICE: {
      const estimates = gasFeeEstimates as EthGasPriceEstimate
      fee = estimates.gasPrice
      break
    }
  }
  return ethers.utils.parseUnits(fee, 'gwei').toString()
}

export async function fetchGasFeeEstimates(
  provider: EvmProvider
): Promise<GasFeeEstimation> {
  const network = await provider.getNetwork()
  const latestBlock = await provider.getBlock('latest')
  const supportEip1559 = !!latestBlock.baseFeePerGas

  try {
    if (supportEip1559) {
      let gasFeeEstimates: GasFeeEstimates
      try {
        gasFeeEstimates = await CODEFI_GAS_API.suggestedGasFees(network.chainId)
      } catch (err) {
        console.warn('CODEFI_GAS_API.suggestedGasFees:', err)
        gasFeeEstimates = await fetchGasFeeEstimatesViaFeeHistory(provider)
      }
      const { suggestedMaxPriorityFeePerGas, suggestedMaxFeePerGas } =
        gasFeeEstimates.medium
      const estimatedGasFeeTimeBounds = calculateTimeEstimate(
        suggestedMaxPriorityFeePerGas,
        suggestedMaxFeePerGas,
        gasFeeEstimates
      )
      return {
        gasFeeEstimates,
        estimatedGasFeeTimeBounds,
        gasEstimateType: GasEstimateType.FEE_MARKET
      }
    } else if (network.chainId === 1) {
      // legacy only for Ethereum mainnet
      const gasFeeEstimates = await CODEFI_GAS_API.gasPrices(network.chainId)
      return {
        gasFeeEstimates,
        gasEstimateType: GasEstimateType.LEGACY
      }
    }
  } catch (err) {
    console.warn('fetchGasFeeEstimates:', err)
    // fallback as follows
  }

  const gasPrice = await provider.getGasPrice()
  return {
    gasFeeEstimates: {
      gasPrice: ethers.utils.formatUnits(gasPrice, 'gwei')
    } as EthGasPriceEstimate,
    gasEstimateType: GasEstimateType.ETH_GAS_PRICE
  }
}

function medianOf(numbers: BigNumber[]): BigNumber {
  const sortedNumbers = numbers
    .slice()
    .sort((a, b) => (a.lt(b) ? -1 : a.gt(b) ? 1 : 0))
  const len = sortedNumbers.length
  const index = Math.floor((len - 1) / 2)
  return sortedNumbers[index]
}
