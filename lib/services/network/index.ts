import assert from 'assert'
import { useLiveQuery } from 'dexie-react-hooks'

import { DB } from '~lib/db'
import { NetworkKind, NetworkType } from '~lib/network'

import { CosmNetworkService } from './cosmService'
import { EvmNetworkService } from './evmService'

export async function initNetworks() {
  await EvmNetworkService.init()
  await CosmNetworkService.init()
}

export function useNetworks(type?: NetworkType, kind?: NetworkKind) {
  assert(!(type && kind))
  return useLiveQuery(() => {
    if (type) {
      return DB.networks.where('type').equals(type).sortBy('sortId')
    } else if (kind) {
      return DB.networks.where('kind').equals(kind).sortBy('sortId')
    } else {
      return DB.networks.orderBy('sortId').toArray()
    }
  }, [type, kind])
}

export function useNetwork(id?: number) {
  return useLiveQuery(() => {
    if (id === undefined) {
      return undefined
    }
    return DB.networks.get(id)
  }, [id])
}

export async function reorderNetworks(startSortId: number, endSortId: number) {
  const clockwise = startSortId < endSortId
  const [lower, upper] = clockwise
    ? [startSortId, endSortId]
    : [endSortId, startSortId]

  await DB.transaction('rw', [DB.networks], async () => {
    const items = await DB.networks
      .where('sortId')
      .between(lower, upper, true, true)
      .sortBy('sortId')
    if (!items.length) {
      return
    }

    for (let i = 0; i < items.length; i++) {
      let sortId = items[i].sortId + (clockwise ? -1 : 1)
      if (sortId > upper) sortId = lower
      else if (sortId < lower) sortId = upper

      await DB.networks.update(items[i], { sortId })
    }
  })
}
