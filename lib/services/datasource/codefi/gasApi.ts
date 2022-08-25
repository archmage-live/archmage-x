import { fetchJson, fetchJsonWithCache } from '~lib/fetch'
import type {
  LegacyGasPriceEstimate,
  SourcedGasFeeEstimates
} from '~lib/services/provider/evm/gasFee'

type SupportedNetwork = {
  active: boolean
  chainId: number
  chainName: string
}

type GasPrices = {
  SafeGasPrice: string
  ProposeGasPrice: string
  FastGasPrice: string
}

class CodeFiGasApi {
  async supportedNetworks() {
    const networks = await fetchJsonWithCache(
      'https://tx-insights.metaswap.codefi.network/networks',
      1000 * 3600 * 24 * 7 // 7 days
    )
    return networks as SupportedNetwork[]
  }

  async suggestedGasFees(chainId: number | string) {
    const gasFees: SourcedGasFeeEstimates = await fetchJson(
      `https://gas-api.metaswap.codefi.network/networks/${chainId}/suggestedGasFees`
    )
    return gasFees
  }

  async gasPrices(chainId: number | string) {
    const gasPrices: GasPrices = await fetchJson(
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
