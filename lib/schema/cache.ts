export interface ICache {
  id: number
  category: string
  key1: string
  key2: string
  key3: string
  data: any
  cachedAt: number
}

export const cacheSchemaV1 = '++id, &[category+key1+key2+key3], cachedAt'
