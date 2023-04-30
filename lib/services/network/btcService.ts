import assert from 'assert'

import { DB, getNextField } from '~lib/db'
import { NetworkKind, checkNetworkKindInitialized } from '~lib/network'
import { BTC_NETWORKS_PRESET, BtcChainInfo } from '~lib/network/btc'
import { ChainId, INetwork, createSearchString } from '~lib/schema'

export class BtcNetworkService {
  static async init() {
    if (!process.env.PLASMO_PUBLIC_ENABLE_BITCOIN) {
      return
    }

    if (await checkNetworkKindInitialized(NetworkKind.BTC)) {
      return
    }

    const nextSortId = await getNextField(DB.networks)
    const nets = BTC_NETWORKS_PRESET.map((net, index) => {
      return {
        ...BtcNetworkService.buildNetwork(net.chainId, net),
        sortId: nextSortId + index
      } as INetwork
    })
    await DB.networks.bulkAdd(nets)
    console.log('initialized btc networks')
  }

  static buildNetwork(chainId: ChainId, info: BtcChainInfo): INetwork {
    assert(chainId === info.chainId)
    return {
      kind: NetworkKind.BTC,
      chainId: info.chainId,
      info: info,
      search: createSearchString(info.name, ...info.currency.symbol)
    } as INetwork
  }
}
