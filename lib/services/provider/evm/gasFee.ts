import { BigNumber } from '@ethersproject/bignumber'
import { ethers } from 'ethers'

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

export async function fetchBlockFeeHistory({
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

type SourcedGasFeeEstimates = {
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

type FallbackGasFeeEstimates = {
  low: Eip1559GasFee
  medium: Eip1559GasFee
  high: Eip1559GasFee
}

type GasFeeEstimates = SourcedGasFeeEstimates | FallbackGasFeeEstimates

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

async function fetchGasEstimatesViaFeeHistory(
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

async function fetchLegacyGasPriceEstimates() {
}

function medianOf(numbers: BigNumber[]): BigNumber {
  const sortedNumbers = numbers
    .slice()
    .sort((a, b) => (a.lt(b) ? -1 : a.gt(b) ? 1 : 0))
  const len = sortedNumbers.length
  const index = Math.floor((len - 1) / 2)
  return sortedNumbers[index]
}
