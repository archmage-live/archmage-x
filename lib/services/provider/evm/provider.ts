import { BigNumber } from '@ethersproject/bignumber'
import { hexValue } from '@ethersproject/bytes'
import { Logger } from '@ethersproject/logger'
import { Network } from '@ethersproject/networks'
import { resolveProperties } from '@ethersproject/properties'
import { BlockTag } from '@ethersproject/providers'
import { UrlJsonRpcProvider as BaseUrlJsonRpcProvider } from '@ethersproject/providers'
import { JsonRpcProvider } from '@ethersproject/providers/src.ts/json-rpc-provider'
import { ConnectionInfo } from '@ethersproject/web'
import assert from 'assert'
import { version } from 'ethers'

import { NetworkKind } from '~lib/network'
import { EvmChainInfo } from '~lib/network/evm'
import { INetwork } from '~lib/schema'
import { IPFS_GATEWAY_API } from '~lib/services/datasource/ipfsGateway'
import { NETWORK_SERVICE } from '~lib/services/network'

export type EthFeeHistoryResponse = {
  oldestBlock: number
  baseFeePerGas?: BigNumber[]
  gasUsedRatio: number[]
  reward?: BigNumber[][]
}

export const logger = new Logger(version)

export class UrlJsonRpcProvider extends BaseUrlJsonRpcProvider {
  async getFeeHistory(
    numberOfBlocks: number,
    endBlockTag: BlockTag | Promise<BlockTag>,
    percentiles: number[]
  ): Promise<EthFeeHistoryResponse> {
    await this.getNetwork()

    const params = await resolveProperties({
      numberOfBlocks,
      endBlockTag: this._getBlockTag(endBlockTag),
      percentiles
    })

    const result = await this.perform('getFeeHistory', params)
    try {
      return {
        oldestBlock: BigNumber.from(result.oldestBlock).toNumber(),
        baseFeePerGas: result.baseFeePerGas?.map((f: string) =>
          BigNumber.from(f)
        ),
        gasUsedRatio: result.gasUsedRatio,
        reward: result.reward?.map((reward: string[]) =>
          reward.map((r: string) => BigNumber.from(r))
        )
      } as EthFeeHistoryResponse
    } catch (error) {
      return logger.throwError(
        'bad result from backend',
        Logger.errors.SERVER_ERROR,
        {
          method: 'getFeeHistory',
          params,
          result,
          error
        }
      )
    }
  }

  prepareRequest(method: string, params: any): [string, Array<any>] {
    switch (method) {
      case 'getFeeHistory':
        return [
          'eth_feeHistory',
          [
            hexValue(params.numberOfBlocks),
            params.endBlockTag,
            params.percentiles
          ]
        ]
      default:
        return super.prepareRequest(method, params)
    }
  }
}

export class EvmProvider extends UrlJsonRpcProvider {
  private static providers = new Map<number, EvmProvider>()

  static async from(
    network: INetwork | number | 'Ethereum Mainnet'
  ): Promise<EvmProvider> {
    if (typeof network !== 'object') {
      const net = await NETWORK_SERVICE.getNetwork({
        kind: NetworkKind.EVM,
        chainId: network === 'Ethereum Mainnet' ? 1 : network
      })
      assert(net)
      network = net
    }

    const info = network.info as EvmChainInfo
    const cached = await EvmProvider.providers.get(+network.chainId)
    if (cached) {
      const net = (await cached.getNetwork()) as Network & {
        rpcUrls: string[]
      }
      if (
        net.name === info.name &&
        net.ensAddress === info.ens?.registry &&
        net.rpcUrls.length === info.rpc.length &&
        net.rpcUrls.every((url, i) => url === info.rpc[i])
      ) {
        // all the same, so return cached
        return cached
      }
    }

    const provider = new EvmProvider(network)
    EvmProvider.providers.set(+network.chainId, provider)
    return provider
  }

  constructor(network: INetwork) {
    const info = network.info as EvmChainInfo
    super({
      name: info.name,
      chainId: +network.chainId,
      ensAddress: info.ens?.registry,
      rpcUrls: info.rpc // extra field
    } as Network)
  }

  static getUrl(network: Network, apiKey: any): ConnectionInfo {
    const rpcUrls: string[] = (network as any).rpcUrls
    if (!rpcUrls?.length) {
      throw new Error('empty evm rpc urls')
    }
    return { url: rpcUrls[0], allowGzip: true } as ConnectionInfo
  }

  async resolveUrl(url: string): Promise<string | undefined> {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      return url
    } else {
      let ipfsHash
      if (!url.startsWith('ipfs://') && url.endsWith('.eth')) {
        const resolver = await this.getResolver(url)
        if (!resolver) {
          return undefined
        }
        ipfsHash = await resolver.getContentHash()
        if (!ipfsHash) {
          return undefined
        }
      } else {
        ipfsHash = url
      }

      if (ipfsHash.startsWith('ipfs://')) {
        ipfsHash = ipfsHash.slice('ipfs://'.length)
      }

      return IPFS_GATEWAY_API.buildUrl(ipfsHash)
    }
  }

  async getBlockInterval(): Promise<number> {
    const thisBlock = await this.getBlock('latest')
    const lastBlock = await this.getBlock(thisBlock.number - 1)
    return thisBlock.timestamp - lastBlock.timestamp // seconds
  }
}

export async function getEvmBlockNumber(url: string) {
  const provider = new JsonRpcProvider({
    url,
    throttleLimit: 1,
    timeout: 3000
  })
  return await provider.getBlockNumber()
}

export async function getEvmChainId(url: string) {
  return (
    await new JsonRpcProvider({
      url,
      throttleLimit: 1,
      timeout: 3000
    }).getNetwork()
  ).chainId
}
