import assert from 'assert'

import { DB, getNextField } from '~lib/db'
import { NetworkKind, checkNetworkKindInitialized } from '~lib/network'
import { SUI_NETWORKS_PRESET, SuiChainInfo } from '~lib/network/sui'
import { ChainId, INetwork, createSearchString } from '~lib/schema'

export const SuiAddressZero =
  '0x0000000000000000000000000000000000000000000000000000000000000000'

export class SuiNetworkService {
  static async init() {
    if (!process.env.PLASMO_PUBLIC_ENABLE_SUI) {
      return
    }

    if (await checkNetworkKindInitialized(NetworkKind.SUI)) {
      return
    }

    const nextSortId = await getNextField(DB.networks)
    const nets = SUI_NETWORKS_PRESET.map((net, index) => {
      return {
        ...SuiNetworkService.buildNetwork(net.chainId, net),
        sortId: nextSortId + index
      } as INetwork
    })
    await DB.networks.bulkAdd(nets)
    console.log('initialized sui networks')
  }

  static buildNetwork(chainId: ChainId, info: SuiChainInfo): INetwork {
    assert(chainId === info.chainId)
    return {
      kind: NetworkKind.SUI,
      chainId: info.chainId,
      info: info,
      search: createSearchString(info.name, info.chainId)
    } as INetwork
  }
}
