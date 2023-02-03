import assert from 'assert'

import { DB, getNextField } from '~lib/db'
import { NetworkKind, checkNetworkKindInitialized } from '~lib/network'
import { EVM_NETWORKS_PRESET, EvmChainInfo } from '~lib/network/evm'
import { ChainId, INetwork, createSearchString } from '~lib/schema/network'

export interface IEvmNetworkService {}

export class EvmNetworkService implements IEvmNetworkService {
  static async init() {
    if (!process.env.PLASMO_PUBLIC_ENABLE_EVM) {
      return
    }

    if (await checkNetworkKindInitialized(NetworkKind.EVM)) {
      return
    }

    const nextSortId = await getNextField(DB.networks)
    const nets = EVM_NETWORKS_PRESET.map((net, index) => {
      return {
        ...EvmNetworkService.buildNetwork(net.chainId, net),
        sortId: nextSortId + index
      } as INetwork
    })
    await DB.networks.bulkAdd(nets)
    console.log('initialized evm networks')
  }

  static buildNetwork(chainId: ChainId, info: EvmChainInfo): INetwork {
    assert(chainId === info.chainId)
    return {
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
