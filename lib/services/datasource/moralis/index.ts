import { EvmChain, EvmNft } from '@moralisweb3/common-evm-utils'
import assert from 'assert'
import Moralis from 'moralis'

import { NetworkKind } from '~lib/network'
import { INetwork } from '~lib/schema'

const defaultApiKey =
  'dnsmQi95M5a3ESOCoT5bzXRgLCkNJvMq5PytWMM2kgCLcWFi4aaiH2vKxHqgis9E'

// https://docs.moralis.io/web3-data-api/evm/nft-api#supported-chains
const networkByChain = new Map([
  [1, EvmChain.ETHEREUM],
  [5, EvmChain.GOERLI],
  [11155111, EvmChain.SEPOLIA],
  [137, EvmChain.POLYGON],
  [80001, EvmChain.MUMBAI],
  [56, EvmChain.BSC],
  [97, EvmChain.BSC_TESTNET],
  [43114, EvmChain.AVALANCHE],
  [250, EvmChain.FANTOM],
  [25, EvmChain.CRONOS],
  [11297108109, EvmChain.PALM],
  [42161, EvmChain.ARBITRUM]
])

class MoralisChainApi {
  constructor(private chain: EvmChain) {}

  getNFTs(address: string) {
    return Moralis.EvmApi.nft.getWalletNFTs({
      address,
      chain: this.chain
    })
  }
}

class MoralisApi {
  private apis = new Map<number, MoralisChainApi>()
  private started = false

  async api(network: INetwork) {
    assert(network.kind === NetworkKind.EVM)
    const net = networkByChain.get(+network.chainId)
    if (!net) {
      return
    }

    if (!this.started) {
      this.started = true
      try {
        await Moralis.start({
          apiKey: defaultApiKey,
          defaultNetwork: 'Evm',
          // defaultEvmApiChain: net,
          formatEvmAddress: 'checksum',
          formatEvmChainId: 'decimal'
        })
      } catch (err) {
        console.error(err)
        this.started = false
      }
    }

    let api = this.apis.get(network.id)
    if (!api) {
      api = new MoralisChainApi(net)
      this.apis.set(network.id, api)
    }
    return api
  }
}

export const MORALIS_API = new MoralisApi()

export type MoralisNft = ReturnType<EvmNft['toJSON']>
