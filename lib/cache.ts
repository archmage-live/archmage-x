import { useEffect, useState } from 'react'
import useSWR, {
  BareFetcher,
  Key,
  SWRConfiguration,
  SWRResponse,
  unstable_serialize
} from 'swr'

import { DB } from '~lib/db'

export async function cleanStaleCache() {
  const maxCount = 1 << 17
  await DB.queryCache
    .orderBy('accessedTime')
    .reverse()
    .offset(maxCount)
    .delete()
}

export function usePersistentSWR<Data = any, Error = any>(
  key: Key,
  fetcher: BareFetcher<Data> | null,
  config: SWRConfiguration<Data, Error, BareFetcher<Data>> | undefined
): SWRResponse<Data, Error> {
  const { data, error, mutate, isValidating } = useSWR(key, fetcher, config)

  const [cachedData, setCachedData] = useState(undefined)

  useEffect(() => {
    const effect = async () => {
      if (data) {
        // store cache
        await DB.queryCache.put({
          id: unstable_serialize(key),
          data,
          accessedTime: Date.now()
        })
      } else {
        // get cache
        const cache = await DB.queryCache
          .where('id')
          .equals(unstable_serialize(key))
          .first()
        if (cache) {
          setCachedData(cache.data)
          await DB.queryCache.update(cache, { accessedTime: Date.now() })
        }
      }
    }

    effect()
  }, [key, data])

  return {
    data: data || cachedData,
    error: !cachedData ? error : undefined,
    mutate, // TODO
    isValidating
  }
}
