import { fetchJSON } from '~lib/fetch'
import type {
  LegacyGasPriceEstimate,
  SourcedGasFeeEstimates
} from '~lib/services/provider/evm/gasFee'

type GasPrices = {
  SafeGasPrice: string
  ProposeGasPrice: string
  FastGasPrice: string
}

class CodeFiGasApi {
  async suggestedGasFees(chainId: number | string) {
    const gasFees: SourcedGasFeeEstimates = await fetchJSON(
      `https://gas-api.metaswap.codefi.network/networks/${chainId}/suggestedGasFees`
    )
    return gasFees
  }

  async gasPrices(chainId: number | string) {
    const gasPrices: GasPrices = await fetchJSON(
      `https://gas-api.metaswap.codefi.network/networks/${chainId}/gasPrices`
    )
    return {
      low: gasPrices.SafeGasPrice,
      medium: gasPrices.ProposeGasPrice,
      high: gasPrices.FastGasPrice
    } as LegacyGasPriceEstimate
  }
}

export const CODEFI_GAS_API = new CodeFiGasApi()
