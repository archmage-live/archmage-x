import { QueryFunctionContext, QueryKey } from '@tanstack/query-core'
import { useQuery } from '@tanstack/react-query'
import {
  PersistedClient,
  Persister
} from '@tanstack/react-query-persist-client'
import assert from 'assert'

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

export enum QueryService {
  PROVIDER = 'provider'
}

const QUERY_SERVICES = new Map<string, any>()

export function registerQueryService(name: string, service: any) {
  if (QUERY_SERVICES.has(name)) {
    throw new Error(`QueryFn '${name}' exists`)
  }
  QUERY_SERVICES.set(name, service)
}

export function useDirectedQuery<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(queryKey: TQueryKey) {
  assert(queryKey.length)
  const service = QUERY_SERVICES.get(queryKey[0] as string)
  const queryFn = ({
    queryKey
  }: QueryFunctionContext<TQueryKey>): Promise<any> => {
    const [_, method, ...params] = queryKey
    return service[method as string](...params)
  }
  return useQuery(queryKey, queryFn)
}
