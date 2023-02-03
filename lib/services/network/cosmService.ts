import assert from 'assert'

import { DB, getNextField } from '~lib/db'
import { NetworkKind, checkNetworkKindInitialized } from '~lib/network'
import { COSM_NETWORKS_PRESET, CosmAppChainInfo } from '~lib/network/cosm'
import { ChainId, INetwork, createSearchString } from '~lib/schema/network'

export class CosmNetworkService {
  static async init() {
    if (!process.env.PLASMO_PUBLIC_ENABLE_COSMOS) {
      return
    }

    if (await checkNetworkKindInitialized(NetworkKind.COSM)) {
      return
    }

    const nextSortId = await getNextField(DB.networks)
    const nets = COSM_NETWORKS_PRESET.map((net, index) => {
      return {
        ...CosmNetworkService.buildNetwork(net.chainId, net),
        sortId: nextSortId + index
      } as INetwork
    })
    await DB.networks.bulkAdd(nets)
    console.log('initialized cosm networks')
  }

  static buildNetwork(chainId: ChainId, info: CosmAppChainInfo): INetwork {
    assert(chainId === info.chainId)
    return {
      kind: NetworkKind.COSM,
      chainId: info.chainId,
      info: info,
      search: createSearchString(
        info.chainId,
        info.chainName,
        ...info.currencies.map((currency) => currency.coinDenom)
      )
    } as INetwork
  }
}
