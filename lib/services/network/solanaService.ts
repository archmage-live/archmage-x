import assert from 'assert'

import { DB, getNextField } from '~lib/db'
import { NetworkKind, checkNetworkKindInitialized } from '~lib/network'
import { SOLANA_NETWORKS_PRESET, SolanaChainInfo } from '~lib/network/solana'
import { ChainId, INetwork, createSearchString } from '~lib/schema'

export class SolanaNetworkService {
  static async init() {
    if (!process.env.PLASMO_PUBLIC_ENABLE_SOLANA) {
      return
    }

    if (await checkNetworkKindInitialized(NetworkKind.SOLANA)) {
      return
    }

    const nextSortId = await getNextField(DB.networks)
    const nets = SOLANA_NETWORKS_PRESET.map((net, index) => {
      return {
        ...SolanaNetworkService.buildNetwork(net.chainId, net),
        sortId: nextSortId + index
      } as INetwork
    })
    await DB.networks.bulkAdd(nets)
    console.log('initialized solana networks')
  }

  static buildNetwork(chainId: ChainId, info: SolanaChainInfo): INetwork {
    assert(chainId === info.chainId)
    return {
      kind: NetworkKind.SOLANA,
      chainId: info.chainId,
      info: info,
      search: createSearchString(info.name, info.chainId)
    } as INetwork
  }
}
