import {
  AlchemySettings,
  Network,
  Alchemy as _Alchemy
} from '@archmagelive/alchemy-sdk'
import type { OwnedNft } from '@archmagelive/alchemy-sdk'

export const defaultApiKey = '_gg7wSSi0KMBsdKnGVfHDueq6xMB9EkC'

// https://docs.alchemy.com/reference/feature-support-by-chain
export const networkByChain = new Map([
  [1, Network.ETH_MAINNET],
  [5, Network.ETH_GOERLI],
  [11155111, Network.ETH_SEPOLIA],
  [10, Network.OPT_MAINNET],
  [420, Network.OPT_GOERLI],
  [42161, Network.ARB_MAINNET],
  [421613, Network.ARB_GOERLI],
  [137, Network.MATIC_MAINNET],
  [80001, Network.MATIC_MUMBAI],
  [592, Network.ASTAR_MAINNET],
  [1101, Network.POLYGONZKEVM_MAINNET],
  [1442, Network.POLYGONZKEVM_TESTNET],
  [8453, Network.BASE_MAINNET],
  [84531, Network.BASE_GOERLI]
])

class Alchemy extends _Alchemy {
  constructor(settings?: AlchemySettings) {
    super(settings)
  }
}

class AlchemyApi {
  private apis = new Map<number, Alchemy>()

  api(chainId: number) {
    const net = networkByChain.get(chainId)
    if (!net) {
      return
    }

    let api = this.apis.get(chainId)
    if (!api) {
      api = new Alchemy({
        apiKey: defaultApiKey,
        network: net,
        batchRequests: true
      })
      this.apis.set(chainId, api)
    }

    return api
  }
}

export const ALCHEMY_API = new AlchemyApi()

export type AlchemyNft = OwnedNft
