export interface IConnectedSite {
  id?: number
  masterId: number // master wallet id
  index: number | undefined // derived wallet index; undefined for imported single wallet
  origin: string // URL.origin
  iconUrl?: string
  connected: boolean
  info: any
}

export const connectedSiteSchemaV1 =
  '++id, &[masterId+index+origin], [masterId+index+connected], [origin+connected]'
