export interface IQueryCache {
  id: string
  data: any
  accessedTime: number
}

// unique key
export const queryCacheSchemaV1 = 'id, accessedTime'
