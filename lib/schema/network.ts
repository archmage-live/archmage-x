import { NetworkKind, NetworkType } from '~lib/network'

export interface INetwork {
  id?: number
  sortId: number
  type: NetworkType
  kind: NetworkKind
  chainId: number | string
  info: any
  search: string
}

export const networkSchemaV1 =
  '++id, sortId, &[type+chainId], &[kind+chainId], search'

export function createSearchString(...args: (string | undefined)[]) {
  let search: string[] = []
  for (const arg of args) {
    if (!arg) {
      continue
    }
    const parts = arg.split(' ').filter((a) => a)
    for (const part of parts) {
      if (search.indexOf(part) < 0) {
        search.push(part)
      }
    }
  }
  return search.join(' ')
}
