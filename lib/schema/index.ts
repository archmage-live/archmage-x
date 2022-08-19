export * from './network'
export * from './wallet'
export * from './hdPath'
export * from './derivedWallet'
export * from './walletInfo'
export * from './queryCache'

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

export function mayUndefinedToNumber(n?: number) {
  return typeof n === 'number' ? n : -1
}

export function numberToMayUndefined(n: number) {
  return n >= 0 ? n : undefined
}
