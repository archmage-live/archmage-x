export interface IFetchCache {
  id: string
  url: string
  response: any
  cachedAt: number
}

export const fetchCacheSchemaV1 = '++id, &url'
