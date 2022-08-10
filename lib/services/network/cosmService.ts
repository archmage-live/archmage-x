import { useLiveQuery } from 'dexie-react-hooks'

import { DB, getNextField } from '~lib/db'
import { ENV } from '~lib/env'
import { NetworkKind, NetworkType } from '~lib/network'
import { EmbedChainInfos as CosmChainInfos } from '~lib/network/cosm'
import { SERVICE_WORKER_CLIENT, SERVICE_WORKER_SERVER } from '~lib/rpc'
import { INetwork, createSearchString } from '~lib/schema/network'

export interface ICosmNetworkService {
  getNetwork(
    kind: NetworkKind,
    chainId: string | number
  ): Promise<INetwork | undefined>
}

export class CosmNetworkService implements ICosmNetworkService {
  static async init() {
    if (await DB.networks.where('type').equals(NetworkType.COSM).count()) {
      return
    }

    const COSM_NETWORKS_PRESET = CosmChainInfos.filter(
      (net) =>
        ['cosmoshub-4', 'osmosis-1', 'secret-4'].indexOf(net.chainId) > -1
    )

    const nextSortId = await getNextField(DB.networks)
    const nets = COSM_NETWORKS_PRESET.map((net, index) => {
      return {
        sortId: nextSortId + index,
        type: NetworkType.COSM,
        kind: NetworkKind.COSM,
        chainId: net.chainId,
        info: net,
        search: createSearchString(net.chainId, net.chainName)
      } as INetwork
    })
    await DB.networks.bulkAdd(nets)
    console.log('initialized cosm networks')
  }

  async getNetwork(
    kind: NetworkKind,
    chainId: string | number
  ): Promise<INetwork | undefined> {
    return DB.networks.where({ kind, chainId }).first()
  }
}

function createCosmNetworkService(): ICosmNetworkService {
  const serviceName = 'cosmNetworkService'
  let service
  if (ENV.inServiceWorker) {
    service = new CosmNetworkService()
    SERVICE_WORKER_SERVER.registerService(serviceName, service)
  } else {
    service = SERVICE_WORKER_CLIENT.service<ICosmNetworkService>(serviceName)
  }
  return service
}

export const COSM_NETWORK_SERVICE = createCosmNetworkService()

export function useCosmNetworks() {
  return useLiveQuery(() =>
    DB.networks.where('type').equals(NetworkType.COSM).toArray()
  )
}
