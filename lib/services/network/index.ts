import assert from 'assert'
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'

import { DB } from '~lib/db'
import { ENV } from '~lib/env'
import { NetworkKind, NetworkType } from '~lib/network'
import { AppChainInfo as CosmChainInfo } from '~lib/network/cosm'
import { EvmChainInfo } from '~lib/network/evm'
import { IChainAccount, INetwork } from '~lib/schema'

import { CosmNetworkService } from './cosmService'
import { EvmNetworkService } from './evmService'

export interface NetworkInfo {
  name: string
  description?: string
  chainId: number | string
  currencySymbol: string
  decimals: number
  rpcUrl?: string
  explorerUrl?: string
}

export function getNetworkInfo(network: INetwork): NetworkInfo {
  switch (network.type) {
    case NetworkType.EVM: {
      const info = network.info as EvmChainInfo
      return {
        name: info.name,
        description: info.title || info.name,
        chainId: info.chainId,
        currencySymbol: info.nativeCurrency.symbol,
        decimals: info.nativeCurrency.decimals,
        rpcUrl: info.rpc.at(0),
        explorerUrl: info.explorers.at(0)?.url
      }
    }
    case NetworkType.COSM: {
      const info = network.info as CosmChainInfo
      return {
        name: info.chainName,
        description: info.chainName,
        chainId: info.chainId,
        currencySymbol: info.feeCurrencies?.[0].coinDenom,
        decimals: info.feeCurrencies?.[0].coinDecimals
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
    url.pathname = `/address/${account.address}`
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
    chainId: number | string,
    info: any
  ): Promise<INetwork> {
    switch (kind) {
      case NetworkKind.EVM:
        return EvmNetworkService.addNetwork(chainId, info)
    }
    // TODO
    return {} as INetwork
  }

  async deleteNetwork(id: number) {
    await DB.networks.delete(id)
  }
}

export const NETWORK_SERVICE = new NetworkService()

export function useNetworks(type?: NetworkType, kind?: NetworkKind) {
  assert(!(type && kind))
  return useLiveQuery(() => {
    if (type) {
      return DB.networks.where('type').equals(type).sortBy('sortId')
    } else if (kind) {
      return DB.networks.where('kind').equals(kind).sortBy('sortId')
    } else {
      return DB.networks.orderBy('sortId').toArray()
    }
  }, [type, kind])
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
