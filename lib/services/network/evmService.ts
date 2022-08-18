import assert from 'assert'

import { DB, getNextField } from '~lib/db'
import { NetworkKind, NetworkType } from '~lib/network'
import { EVM_NETWORKS_PRESET, EvmChainInfo } from '~lib/network/evm'
import { INetwork, createSearchString } from '~lib/schema/network'

export interface IEvmNetworkService {}

export class EvmNetworkService implements IEvmNetworkService {
  static async init() {
    if (await DB.networks.where('type').equals(NetworkType.EVM).count()) {
      return
    }

    const nextSortId = await getNextField(DB.networks)
    const nets = EVM_NETWORKS_PRESET.map((net, index) => {
      return {
        ...EvmNetworkService.buildNetwork(net),
        sortId: nextSortId + index
      } as INetwork
    })
    await DB.networks.bulkAdd(nets)
    console.log('initialized evm networks')
  }

  static async addNetwork(
    chainId: number | string,
    info: EvmChainInfo
  ): Promise<INetwork> {
    assert(chainId === info.chainId)
    const network = EvmNetworkService.buildNetwork(info)
    network.sortId = await getNextField(DB.networks)
    network.id = await DB.networks.add(network)
    return network
  }

  private static buildNetwork(info: EvmChainInfo): INetwork {
    return {
      type: NetworkType.EVM,
      kind: NetworkKind.EVM,
      chainId: info.chainId,
      info: info,
      search: createSearchString(
        info.name,
        info.shortName,
        info.chain,
        info.network,
        info.title,
        info.infoURL
      )
    } as INetwork
  }
}
