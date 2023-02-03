import { NetworkKind } from '~lib/network'

export interface INetwork {
  id: number
  sortId: number
  kind: NetworkKind
  chainId: ChainId
  info: any
  search: string
}

export const networkSchemaV1 = '++id, sortId, &[kind+chainId], search'

export type ChainId = number | string

export function createSearchString(...args: (string | undefined)[]) {
  let search: string[] = []
  for (const arg of args) {
    if (!arg) {
      continue
    }
    const parts = arg.split(' ').filter(Boolean)
    for (const part of parts) {
      if (search.indexOf(part) < 0) {
        search.push(part)
      }
    }
  }
  return search.join(' ')
}
