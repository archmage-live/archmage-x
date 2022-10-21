import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'

import { DB, getNextField } from '~lib/db'
import { ENV } from '~lib/env'
import { NetworkKind } from '~lib/network'
import { AptosChainInfo } from '~lib/network/aptos'
import { CosmChainInfo } from '~lib/network/cosm'
import { EvmChainInfo } from '~lib/network/evm'
import { ChainId, IChainAccount, INetwork, IToken } from '~lib/schema'

import { AptosNetworkService } from './aptosService'
import { CosmNetworkService } from './cosmService'
import { EvmNetworkService } from './evmService'

export interface NetworkInfo {
  name: string
  description?: string
  chainId: number | string
  currencyName: string
  currencySymbol: string
  decimals: number
  rpcUrl?: string
  explorerUrl?: string
}

export function getNetworkInfo(network: INetwork): NetworkInfo {
  switch (network.kind) {
    case NetworkKind.EVM: {
      const info = network.info as EvmChainInfo
      return {
        name: info.name,
        description: info.title || info.name,
        chainId: info.chainId,
        currencyName: info.nativeCurrency.name,
        currencySymbol: info.nativeCurrency.symbol,
        decimals: info.nativeCurrency.decimals,
        rpcUrl: info.rpc.at(0),
        explorerUrl: info.explorers.at(0)?.url
      }
    }
    case NetworkKind.COSM: {
      const info = network.info as CosmChainInfo
      return {
        name: info.chainName,
        description: info.chainName,
        chainId: info.chainId,
        currencyName: info.feeCurrencies?.[0].coinDenom,
        currencySymbol: info.feeCurrencies?.[0].coinDenom,
        decimals: info.feeCurrencies?.[0].coinDecimals
      }
    }
    case NetworkKind.APTOS: {
      const info = network.info as AptosChainInfo
      return {
        name: info.name,
        description: info.name,
        chainId: info.chainId,
        currencyName: info.currency.name,
        currencySymbol: info.currency.symbol,
        decimals: info.currency.decimals,
        rpcUrl: info.rpc.at(0),
        explorerUrl: info.explorers.at(0)
      }
    }
    default:
      return {} as NetworkInfo
  }
}

export function getAccountUrl(
  network: INetwork,
  account: IChainAccount
): string | undefined {
  const info = getNetworkInfo(network)
  if (!info?.explorerUrl || !account?.address) {
    return undefined
  }
  try {
    const url = new URL(info.explorerUrl)

    let pathPrefix
    switch (network.kind) {
      case NetworkKind.EVM:
        pathPrefix = 'address'
        break
      case NetworkKind.APTOS:
        pathPrefix = !url.host.includes('aptoscan.com') ? 'account' : 'address'
        break
      default:
        return undefined
    }

    url.pathname = `/${pathPrefix}/${account.address}`
    return url.toString()
  } catch {
    return undefined
  }
}

export function getTransactionUrl(
  network: INetwork,
  txId: string | number
): string | undefined {
  const info = getNetworkInfo(network)
  if (!info?.explorerUrl) {
    return undefined
  }
  try {
    const url = new URL(info.explorerUrl)

    let pathPrefix
    switch (network.kind) {
      case NetworkKind.EVM:
        pathPrefix = 'tx'
        break
      case NetworkKind.APTOS:
        pathPrefix = !url.host.includes('aptoscan.com') ? 'txn' : 'version'
        break
      default:
        return undefined
    }

    url.pathname = `/${pathPrefix}/${txId}`
    return url.toString()
  } catch {
    return undefined
  }
}

export function getTokenUrl(
  network: INetwork,
  token: IToken
): string | undefined {
  const info = getNetworkInfo(network)
  if (!info?.explorerUrl || !token) {
    return undefined
  }
  try {
    const url = new URL(info.explorerUrl)

    let pathPrefix
    switch (network.kind) {
      case NetworkKind.EVM:
        pathPrefix = 'token'
        break
      case NetworkKind.APTOS:
        // TODO
        return undefined
      default:
        return undefined
    }

    url.pathname = `/${pathPrefix}/${token.token}`
    return url.toString()
  } catch {
    return undefined
  }
}

export class NetworkService {
  static async init() {
    if (ENV.inServiceWorker) {
      await EvmNetworkService.init()
      await CosmNetworkService.init()
      await AptosNetworkService.init()
    }
  }

  async getNetworks(kind?: NetworkKind) {
    if (!kind) {
      return DB.networks.toArray()
    } else {
      return DB.networks.where('kind').equals(kind).toArray()
    }
  }

  async getNetwork(
    id: number | { kind: NetworkKind; chainId: number | string }
  ): Promise<INetwork | undefined> {
    if (typeof id === 'number') {
      return DB.networks.get(id)
    } else {
      return DB.networks.where({ kind: id.kind, chainId: id.chainId }).first()
    }
  }

  async addNetwork(
    kind: NetworkKind,
    chainId: ChainId,
    info: any
  ): Promise<INetwork> {
    let network
    switch (kind) {
      case NetworkKind.EVM:
        network = EvmNetworkService.buildNetwork(chainId, info)
        break
      case NetworkKind.APTOS:
        network = AptosNetworkService.buildNetwork(chainId, info)
        break
      default:
        throw new Error(`network ${kind} is not implemented`)
    }
    network.sortId = await getNextField(DB.networks)
    network.id = await DB.networks.add(network)
    return network
  }

  async deleteNetwork(id: number) {
    await DB.transaction(
      'rw',
      [
        DB.networks,
        DB.chainAccounts,
        DB.pendingTxs,
        DB.transactions,
        DB.tokens
      ],
      async () => {
        const network = await DB.networks.get(id)
        if (!network) {
          return
        }

        await DB.networks.delete(id)

        const query = { networkKind: network.kind, chainId: network.chainId }
        await DB.chainAccounts.where(query).delete()
        await DB.pendingTxs.where(query).delete()
        await DB.transactions.where(query).delete()
        await DB.tokens.where(query).delete()
      }
    )
  }
}

export const NETWORK_SERVICE = new NetworkService()

export function useNetworks(kind?: NetworkKind) {
  return useLiveQuery(() => {
    if (kind) {
      return DB.networks.where('kind').equals(kind).sortBy('sortId')
    } else {
      return DB.networks.orderBy('sortId').toArray()
    }
  }, [kind])
}

export function useNetworksInfo(networks?: INetwork[]) {
  return useMemo(() => networks?.map((net) => getNetworkInfo(net)), [networks])
}

export function useNetwork(id?: number) {
  return useLiveQuery(() => {
    if (id === undefined) {
      return undefined
    }
    return DB.networks.get(id)
  }, [id])
}

export async function reorderNetworks(startSortId: number, endSortId: number) {
  const clockwise = startSortId < endSortId
  const [lower, upper] = clockwise
    ? [startSortId, endSortId]
    : [endSortId, startSortId]

  await DB.transaction('rw', [DB.networks], async () => {
    const items = await DB.networks
      .where('sortId')
      .between(lower, upper, true, true)
      .sortBy('sortId')
    if (!items.length) {
      return
    }

    for (let i = 0; i < items.length; i++) {
      let sortId = items[i].sortId + (clockwise ? -1 : 1)
      if (sortId > upper) sortId = lower
      else if (sortId < lower) sortId = upper

      await DB.networks.update(items[i], { sortId })
    }
  })
}
