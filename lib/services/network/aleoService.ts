import assert from 'assert'

import { DB, getNextField } from '~lib/db'
import { NetworkKind, checkNetworkKindInitialized } from '~lib/network'
import { ALEO_NETWORKS_PRESET, AleoNetworkInfo } from '~lib/network/aleo'
import { ChainId, INetwork, createSearchString } from '~lib/schema'

export class AleoNetworkService {
  static async init() {
    if (!process.env.PLASMO_PUBLIC_ENABLE_ALEO) {
      return
    }

    if (await checkNetworkKindInitialized(NetworkKind.ALEO)) {
      return
    }

    const nextSortId = await getNextField(DB.networks)
    const nets = ALEO_NETWORKS_PRESET.map((net, index) => {
      return {
        ...AleoNetworkService.buildNetwork(net.networkId, net),
        sortId: nextSortId + index
      } as INetwork
    })
    await DB.networks.bulkAdd(nets)
    console.log('initialized aleo networks')
  }

  static buildNetwork(chainId: ChainId, info: AleoNetworkInfo): INetwork {
    assert(chainId === info.networkId)
    return {
      kind: NetworkKind.ALEO,
      chainId: info.networkId,
      info: info,
      search: createSearchString(info.name)
    } as INetwork
  }
}
