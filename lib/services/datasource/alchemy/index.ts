import { AlchemySettings, Network, Alchemy as _Alchemy } from 'alchemy-sdk'
import assert from 'assert'

import { NetworkKind } from '~lib/network'
import { INetwork } from '~lib/schema'

export const defaultApiKey = '_gg7wSSi0KMBsdKnGVfHDueq6xMB9EkC'

export const networkByChain = new Map([
  [1, Network.ETH_MAINNET],
  [5, Network.ETH_GOERLI],
  [10, Network.OPT_MAINNET],
  [420, Network.OPT_GOERLI],
  [42161, Network.ARB_MAINNET],
  [421613, Network.ARB_GOERLI],
  [137, Network.MATIC_MAINNET],
  [80001, Network.MATIC_MUMBAI],
  [592, Network.ASTAR_MAINNET]
])

class Alchemy extends _Alchemy {
  constructor(settings?: AlchemySettings) {
    super(settings)
  }
}

class AlchemyApi {
  private apis = new Map<number, Alchemy>()

  api(network: INetwork) {
    assert(network.kind === NetworkKind.EVM)
    const net = networkByChain.get(+network.chainId)
    if (!net) {
      return
    }

    let api = this.apis.get(network.id)
    if (!api) {
      api = new Alchemy({
        apiKey: defaultApiKey,
        network: net
      })
      this.apis.set(network.id, api)
    }

    return api
  }
}

export const ALCHEMY_API = new AlchemyApi()
