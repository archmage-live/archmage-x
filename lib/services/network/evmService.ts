import { useLiveQuery } from 'dexie-react-hooks'

import { DB } from '~lib/db'
import { ENV } from '~lib/env'
import { NetworkType } from '~lib/network'
import { EVM_NETWORKS_PRESETS } from '~lib/network/evm'
import { SERVICE_WORKER_CLIENT, SERVICE_WORKER_SERVER } from '~lib/rpc'
import { INetwork, createSearchString } from '~lib/schema/network'

export interface IEvmNetworkService {}

class EvmNetworkService implements IEvmNetworkService {
  async init() {
    if (await DB.networks.where('type').equals(NetworkType.EVM).count()) {
      return
    }
    const nets = EVM_NETWORKS_PRESETS.map((net, index) => {
      return {
        sortId: index,
        type: NetworkType.EVM,
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
    service.init()
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
