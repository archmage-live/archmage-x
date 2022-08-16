import { fetchJSON } from '~lib/fetch'
import type { Eip1559GasFee } from '~lib/services/provider/evm/gasFee'

type SuggestedGasFees = {
  low: Eip1559GasFee
  medium: Eip1559GasFee
  high: Eip1559GasFee
  estimatedBaseFee: string
  networkCongestion: number | string
  latestPriorityFeeRange: [string, string]
  historicalPriorityFeeRange: [string, string]
  historicalBaseFeeRange: [string, string]
  priorityFeeTrend: 'up' | 'down'
  baseFeeTrend: 'up' | 'down'
}

type GasPrices = {
  SafeGasPrice: string
  ProposeGasPrice: string
  FastGasPrice: string
}

type LegacyGasPriceEstimate = {
  high: string
  medium: string
  low: string
}

class CodeFiGasApi {
  async suggestedGasFees(chainId: number | string) {
    const gasFees = await fetchJSON(
      `https://gas-api.metaswap.codefi.network/networks/${chainId}/suggestedGasFees`,
      true
    )
    return gasFees as SuggestedGasFees
  }

  async gasPrices(chainId: number | string) {
    const gasPrices = await fetchJSON(
      `https://gas-api.metaswap.codefi.network/networks/${chainId}/gasPrices`,
      true
    )
    return gasPrices as GasPrices
  }
}

export const CODEFI_GAS_API = new CodeFiGasApi()
