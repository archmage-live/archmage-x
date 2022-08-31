import { NetworkKind } from '~lib/network'

export interface ITokenList {
  id: number
  networkKind: NetworkKind
  url: string
  enabled: boolean
  info: any
  tokens: any[]
}

export const tokenListSchemaV1 = '++id, &[networkKind,url]'
