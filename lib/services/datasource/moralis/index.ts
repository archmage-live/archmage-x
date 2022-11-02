import type from '@moralisweb3/api-utils'
import MoralisCore from '@moralisweb3/core'
import MoralisEvmApi from '@moralisweb3/evm-api'
import { EvmChain } from '@moralisweb3/evm-utils'
import assert from 'assert'

import { NetworkKind } from '~lib/network'
import { INetwork } from '~lib/schema'

const defaultApiKey =
  'dnsmQi95M5a3ESOCoT5bzXRgLCkNJvMq5PytWMM2kgCLcWFi4aaiH2vKxHqgis9E'

const networkByChain = new Map([
  [1, EvmChain.ETHEREUM],
  [5, EvmChain.GOERLI],
  [11155111, EvmChain.SEPOLIA],
  [137, EvmChain.POLYGON],
  [80001, EvmChain.MUMBAI],
  [56, EvmChain.BSC],
  [97, EvmChain.BSC_TESTNET],
  [43114, EvmChain.AVALANCHE],
  [43113, EvmChain.FUJI],
  [250, EvmChain.FANTOM],
  [25, EvmChain.CRONOS],
  [338, EvmChain.CRONOS_TESTNET]
])

class Moralis {
  constructor(private core: MoralisCore) {}

  get evmApi() {
    return this.core.getModule<MoralisEvmApi>(MoralisEvmApi.moduleName)
  }

  getNFTs(address: string) {
    return this.evmApi.nft.getWalletNFTs({
      address
    })
  }
}

class MoralisApi {
  private apis = new Map<number, Moralis>()

  async api(network: INetwork) {
    assert(network.kind === NetworkKind.EVM)
    const net = networkByChain.get(+network.chainId)
    if (!net) {
      return
    }

    let api = this.apis.get(network.id)
    if (!api) {
      const core = MoralisCore.create()
      core.registerModules([MoralisEvmApi])
      await core.start({
        apiKey: defaultApiKey,
        defaultNetwork: 'Evm',
        defaultEvmApiChain: net,
        formatEvmAddress: 'checksum',
        formatEvmChainId: 'decimal'
      })
      api = new Moralis(core)
      this.apis.set(network.id, api)
    }
    return api
  }
}

export const MORALIS_API = new MoralisApi()
