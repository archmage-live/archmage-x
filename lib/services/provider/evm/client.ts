import {
  TransactionReceipt,
  TransactionResponse
} from '@ethersproject/abstract-provider'
import { BigNumber } from '@ethersproject/bignumber'
import { hexValue } from '@ethersproject/bytes'
import { Logger } from '@ethersproject/logger'
import { Network } from '@ethersproject/networks'
import { resolveProperties } from '@ethersproject/properties'
import { BaseProvider, BlockTag } from '@ethersproject/providers'
import {
  UrlJsonRpcProvider as BaseUrlJsonRpcProvider,
  JsonRpcProvider,
  WebSocketProvider
} from '@ethersproject/providers'
import { ConnectionInfo } from '@ethersproject/web'
import assert from 'assert'
import { version } from 'ethers'

import { NetworkKind } from '~lib/network'
import { EvmChainInfo } from '~lib/network/evm'
import { ChainId, IChainAccount, INetwork } from '~lib/schema'
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

  static getUrl(network: Network, apiKey: any): ConnectionInfo {
    const rpcUrls: string[] = (network as any).rpcUrls
    if (!rpcUrls?.length) {
      throw new Error('empty evm rpc urls')
    }
    return { url: rpcUrls[0], allowGzip: true } as ConnectionInfo
  }
}

export class EvmClient extends UrlJsonRpcProvider {
  protected constructor(protected iNetwork: INetwork) {
    const info = iNetwork.info as EvmChainInfo
    super({
      name: info.name,
      chainId: +iNetwork.chainId,
      ensAddress: info.ens?.registry,
      rpcUrls: info.rpc // extra field
    } as Network)
  }

  private static clients = new Map<
    number,
    BaseProvider | Promise<BaseProvider>
  >()

  static async from(network: INetwork | ChainId): Promise<EvmClient> {
    const { cached, network: net } = await getCachedProvider(
      this.clients,
      network
    )
    if (cached) {
      return cached as EvmClient
    }

    const client = new EvmClient(net)

    this.clients.set(+net.chainId, client)

    return client
  }

  async getTransactionCount(
    accountOrAddressOrName: IChainAccount | string | Promise<string>,
    ...args: any[]
  ): Promise<number> {
    const aan = await accountOrAddressOrName
    const addressOrName = typeof aan === 'string' ? aan : aan.address
    assert(addressOrName)
    return super.getTransactionCount(addressOrName, ...args)
  }

  async getTransaction(
    transactionHash: string | Promise<string>,
    account?: IChainAccount
  ): Promise<TransactionResponse> {
    return super.getTransaction(transactionHash)
  }

  async getTransactionReceipt(
    transactionHash: string | Promise<string>,
    account?: IChainAccount
  ): Promise<TransactionReceipt> {
    return super.getTransactionReceipt(transactionHash)
  }

  async waitForTransaction(
    transactionHash: string,
    confirmations?: number,
    timeout?: number,
    replaceable?: {
      data: string
      from: string
      nonce: number
      to: string
      value: BigNumber
      startBlock: number
    },
    account?: IChainAccount
  ): Promise<TransactionReceipt> {
    return this._waitForTransaction(
      transactionHash,
      typeof confirmations !== 'number' ? 1 : confirmations,
      timeout || 0,
      replaceable as any
    )
  }
}

export async function getCachedProvider(
  providers: Map<number, BaseProvider | Promise<BaseProvider>>,
  network: INetwork | ChainId
) {
  if (typeof network !== 'object') {
    const net = await NETWORK_SERVICE.getNetwork({
      kind: NetworkKind.EVM,
      chainId: network
    })
    assert(net)
    network = net
  }

  const info = network.info as EvmChainInfo
  const cached = await providers.get(+network.chainId)
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
      return {
        cached,
        network
      }
    }
  }

  return {
    network
  }
}

export async function resolveEvmUrl(
  provider: BaseProvider,
  url: string
): Promise<string | undefined> {
  if (url.startsWith('https://') || url.startsWith('http://')) {
    return url
  } else {
    let ipfsHash
    if (!url.startsWith('ipfs://') && url.endsWith('.eth')) {
      const resolver = await provider.getResolver(url)
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
