import { NetworkType } from '~lib/network'

export interface IWalletInfo {
  id?: number
  masterId: number // master wallet id
  index: number | undefined // derived wallet index; undefined for imported single wallet
  networkType: NetworkType
  address: string
  info: any
}

export const walletInfoSchemaV1 =
  '++id, &[masterId+index+networkType], address'
