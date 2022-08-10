import { useLiveQuery } from 'dexie-react-hooks'

import { DB, getNextField } from '~lib/db'
import { ENV } from '~lib/env'
import { NetworkKind, NetworkType } from '~lib/network'
import { EVM_NETWORKS_PRESET } from '~lib/network/evm'
import { SERVICE_WORKER_CLIENT, SERVICE_WORKER_SERVER } from '~lib/rpc'
import { INetwork, createSearchString } from '~lib/schema/network'

export interface IEvmNetworkService {}

export class EvmNetworkService implements IEvmNetworkService {
  static async init() {
    if (await DB.networks.where('type').equals(NetworkType.EVM).count()) {
      return
    }

    const nextSortId = await getNextField(DB.networks)
    const nets = EVM_NETWORKS_PRESET.map((net, index) => {
      return {
        sortId: nextSortId + index,
        type: NetworkType.EVM,
        kind: NetworkKind.EVM,
        chainId: net.chainId,
        info: net,
        search: createSearchString(
          net.name,
          net.shortName,
          net.chain,
          net.network,
          net.title,
          net.infoURL
        )
      } as INetwork
    })
    await DB.networks.bulkAdd(nets)
    console.log('initialized evm networks')
  }
}

function createEvmNetworkService(): IEvmNetworkService {
  const serviceName = 'evmNetworkService'
  let service
  if (ENV.inServiceWorker) {
    service = new EvmNetworkService()
    SERVICE_WORKER_SERVER.registerService(serviceName, service)
  } else {
    service = SERVICE_WORKER_CLIENT.service<IEvmNetworkService>(serviceName)
  }
  return service
}

export const EVM_NETWORK_SERVICE = createEvmNetworkService()

export function useEvmNetworks() {
  return useLiveQuery(() =>
    DB.networks.where('type').equals(NetworkType.EVM).toArray()
  )
}
