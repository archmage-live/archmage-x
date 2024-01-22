import assert from 'assert'

import { DB, getNextField } from '~lib/db'
import { NetworkKind, checkNetworkKindInitialized } from '~lib/network'
import { SOL_NETWORKS_PRESET, SolChainInfo } from '~lib/network/sol'
import { ChainId, INetwork, createSearchString } from '~lib/schema'

export class SolNetworkService {
  static async init() {
    if (!process.env.PLASMO_PUBLIC_ENABLE_SOLANA) {
      return
    }

    if (await checkNetworkKindInitialized(NetworkKind.SOL)) {
      return
    }

    const nextSortId = await getNextField(DB.networks)
    const nets = SOL_NETWORKS_PRESET.map((net, index) => {
      return {
        ...SolNetworkService.buildNetwork(net.chainId, net),
        sortId: nextSortId + index
      } as INetwork
    })
    await DB.networks.bulkAdd(nets)
    console.log('initialized solana networks')
  }

  static buildNetwork(chainId: ChainId, info: SolChainInfo): INetwork {
    assert(chainId === info.chainId)
    return {
      kind: NetworkKind.SOL,
      chainId: info.chainId,
      info: info,
      search: createSearchString(info.name, info.chainId)
    } as INetwork
  }
}
