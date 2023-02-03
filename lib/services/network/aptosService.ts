import assert from 'assert'

import { DB, getNextField } from '~lib/db'
import { NetworkKind, checkNetworkKindInitialized } from '~lib/network'
import { APTOS_NETWORKS_PRESET, AptosChainInfo } from '~lib/network/aptos'
import { ChainId, INetwork, createSearchString } from '~lib/schema'

export const AptosAddressZero =
  '0x0000000000000000000000000000000000000000000000000000000000000000'

export class AptosNetworkService {
  static async init() {
    if (!process.env.PLASMO_PUBLIC_ENABLE_APTOS) {
      return
    }

    if (await checkNetworkKindInitialized(NetworkKind.APTOS)) {
      return
    }

    const nextSortId = await getNextField(DB.networks)
    const nets = APTOS_NETWORKS_PRESET.map((net, index) => {
      return {
        ...AptosNetworkService.buildNetwork(net.chainId, net),
        sortId: nextSortId + index
      } as INetwork
    })
    await DB.networks.bulkAdd(nets)
    console.log('initialized aptos networks')
  }

  static buildNetwork(chainId: ChainId, info: AptosChainInfo): INetwork {
    assert(chainId === info.chainId)
    return {
      kind: NetworkKind.APTOS,
      chainId: info.chainId,
      info: info,
      search: createSearchString(info.name)
    } as INetwork
  }
}
