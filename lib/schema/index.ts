import { SubIndex } from '~lib/schema/subWallet'

export * from './network'
export * from './wallet'
export * from './hdPath'
export * from './subWallet'
export * from './chainAccount'
export * from './chainAccountAux'
export * from './pendingTx'
export * from './transaction'
export * from './tokenList'
export * from './token'
export * from './connectedSite'
export * from './addressBook'
export * from './cache'

// https://dexie.org/docs/Indexable-Type
// non-indexable types:
//   boolean
//   undefined
//   Object
//   null

export function booleanToNumber(b: boolean) {
  return b ? 1 : 0
}

export function numberToBoolean(n: number) {
  return n !== 0
}

export function mapBySubIndex<T extends SubIndex>(
  array: T[]
): Map<number, Map<number, T>> {
  const map = new Map<number, Map<number, T>>()
  for (const item of array) {
    let m = map.get(item.masterId)
    if (!m) {
      m = new Map()
      map.set(item.masterId, m)
    }

    m.set(item.index, item)
  }
  return map
}
