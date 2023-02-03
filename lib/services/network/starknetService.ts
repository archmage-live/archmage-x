import assert from 'assert'

import { DB, getNextField } from '~lib/db'
import { NetworkKind, checkNetworkKindInitialized } from '~lib/network'
import {
  STARKNET_NETWORKS_PRESET,
  StarknetChainInfo
} from '~lib/network/starknet'
import { ChainId, INetwork, createSearchString } from '~lib/schema'

export class StarknetNetworkService {
  static async init() {
    if (!process.env.PLASMO_PUBLIC_ENABLE_STARKNET) {
      return
    }

    if (await checkNetworkKindInitialized(NetworkKind.STARKNET)) {
      return
    }

    const nextSortId = await getNextField(DB.networks)
    const nets = STARKNET_NETWORKS_PRESET.map((net, index) => {
      return {
        ...StarknetNetworkService.buildNetwork(net.chainId, net),
        sortId: nextSortId + index
      } as INetwork
    })
    await DB.networks.bulkAdd(nets)
    console.log('initialized starknet networks')
  }

  static buildNetwork(chainId: ChainId, info: StarknetChainInfo): INetwork {
    assert(chainId === info.chainId)
    return {
      kind: NetworkKind.STARKNET,
      chainId: info.chainId,
      info: info,
      search: createSearchString(info.name)
    } as INetwork
  }
}
