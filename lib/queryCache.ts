import {
  PersistedClient,
  Persister
} from '@tanstack/react-query-persist-client'

import { DB } from '~lib/db'

export function createQueryCachePersister(
  id: string = 'queryCache'
): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      await DB.queryCache.put({
        id,
        persisted: client
      })
    },
    restoreClient: async () => {
      const cache = await DB.queryCache.where('id').equals(id).first()
      return cache?.persisted
    },
    removeClient: async () => {
      await DB.queryCache.where('id').equals(id).delete()
    }
  }
}
