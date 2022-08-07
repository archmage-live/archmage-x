import { useLiveQuery } from 'dexie-react-hooks'

import { DB } from '~lib/db'
import { NetworkType } from '~lib/network'

import { CosmNetworkService } from './cosmService'
import { EvmNetworkService } from './evmService'

export async function initNetworks() {
  await EvmNetworkService.init()
  await CosmNetworkService.init()
}

export function useNetworks(type?: NetworkType) {
  return useLiveQuery(() => {
    if (type === undefined) {
      return DB.networks.orderBy('sortId').toArray()
    } else {
      return DB.networks.where('type').equals(type).sortBy('sortId')
    }
  }, [type])
}
