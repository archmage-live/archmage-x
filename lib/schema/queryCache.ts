import { PersistedClient } from '@tanstack/react-query-persist-client'

export interface IQueryCache {
  id: string
  persisted: PersistedClient
}

// unique id
export const queryCacheSchemaV1 = 'id'
