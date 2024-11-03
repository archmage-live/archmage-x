import { ethers } from 'ethers'
import {
  Chain,
  ChainFormatters,
  PublicClient,
  WalletClient,
  createPublicClient,
  defineChain,
  getAddress,
  http,
  walletActions
} from 'viem'
import { toAccount } from 'viem/accounts'
import chains from 'viem/chains'

import { assert } from '~archmage/errors'
import { NetworkKind } from '@/archmage/network'
import { EthereumChainInfo } from '~archmage/network/evm'
import { ChainId, IChainAccount, INetwork } from '~lib/schema'
import { IPFS_GATEWAY_API } from '~lib/services/datasource/ipfsGateway'
import { NETWORK_SERVICE } from '~lib/services/network'

let chainsMap: Map<number, Chain<ChainFormatters>>

function getChain(chainId: number) {
  if (!chainsMap) {
    chainsMap = new Map()
    for (const name of Object.keys(chains)) {
      const chain: Chain<ChainFormatters> = (chains as any)[name]
      chainsMap.set(chain.id, chain)
    }
  }
  return chainsMap.get(chainId)
}

export type EthClient = PublicClient

const clients = new Map<number, EthClient>()

export async function getCachedClient(
  clients: Map<number, any>,
  network: INetwork | ChainId
) {
  if (typeof network !== 'object') {
    const net = await NETWORK_SERVICE.getNetwork({
      kind: NetworkKind.EVM,
      chainId: network
    })
    assert(net, `network '${network}' not found`)
    network = net
  }

  const client = clients.get(+network.chainId)
  return {
    client,
    network
  }
}

export async function createEthClient(
  network: INetwork | ChainId
): Promise<EthClient> {
  const { client: cached, network: net } = await getCachedClient(
    clients,
    network
  )
  if (cached) {
    return cached
  }

  const info = net.info as EthereumChainInfo

  const chain = defineChain({
    ...getChain(+net.chainId),

    id: +net.chainId,
    name: info.name,
    nativeCurrency: info.nativeCurrency,
    rpcUrls: {
      default: {
        http: info.rpc,
        webSocket: undefined // TODO
      }
    },
    blockExplorers: {
      default: {
        name: info.explorers[0].name,
        url: info.explorers[0].url
      },
      ...info.explorers.reduce((o, explorer) => {
        o[explorer.name] = {
          name: explorer.name,
          url: explorer.url
        }
        return o
      }, {} as { [key: string]: NonNullable<Chain['blockExplorers']>['default'] })
    },
    testnet: info.network === 'testnet'
  })

  const client = createPublicClient({
    chain,
    transport: http(info.rpc[0], {
      batch: {
        wait: 50
      }
    }),
    batch: {
      multicall: {
        wait: 50
      }
    }
  })

  clients.set(+net.chainId, client)

  return client
}

export function createEthWalletClient(
  client: EthClient,
  account: IChainAccount
): WalletClient {
  function extend(base: typeof client) {
    type ExtendFn = (base: typeof client) => unknown
    return (extendFn: ExtendFn) => {
      const extended = extendFn(base) as any
      for (const key in client) delete extended[key]
      const combined = { ...base, ...extended }
      return Object.assign(combined, { extend: extend(combined as any) })
    }
  }

  return Object.assign(
    {},
    {
      ...client,
      account: toAccount({
        address: getAddress(account.address!)
      } as any), // TODO
      extend: extend(client) as any
    }
  ).extend(walletActions)
}

export async function resolveEthUrl(url: string) {
  if (url.startsWith('https://') || url.startsWith('http://')) {
    return url
  } else {
    let ipfsHash
    if (!url.startsWith('ipfs://') && url.endsWith('.eth')) {
      const provider = new ethers.JsonRpcProvider(url)
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

export async function getEthBlockNumber(url: string) {
  const client = createPublicClient({
    transport: http(url)
  })
  return Number(await client.getBlockNumber())
}

export async function getEthChainId(url: string) {
  const client = createPublicClient({
    transport: http(url)
  })
  return await client.getChainId()
}
