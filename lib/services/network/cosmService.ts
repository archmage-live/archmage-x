import { DB, getNextField } from '~lib/db'
import { NetworkKind } from '~lib/network'
import { COSM_NETWORKS_PRESET } from '~lib/network/cosm'
import { INetwork, createSearchString } from '~lib/schema/network'

export class CosmNetworkService {
  static async init() {
    if (!process.env.PLASMO_PUBLIC_ENABLE_COSMOS) {
      return
    }

    if (await DB.networks.where('kind').equals(NetworkKind.COSM).count()) {
      return
    }

    const nextSortId = await getNextField(DB.networks)
    const nets = COSM_NETWORKS_PRESET.map((net, index) => {
      return {
        sortId: nextSortId + index,
        kind: NetworkKind.COSM,
        chainId: net.chainId,
        info: net,
        search: createSearchString(net.chainId, net.chainName)
      } as INetwork
    })
    await DB.networks.bulkAdd(nets)
    console.log('initialized cosm networks')
  }
}
