import { InMemoryCache } from '@apollo/client'
import { PersistentStorage, persistCache } from 'apollo3-cache-persist'

import { logger } from '@/archmage/logger/logger'

/**
 * Initializes and persists/rehydrates cache
 */
export async function initAndPersistCache({
  storage,
  maxCacheSizeInBytes
}: {
  storage: PersistentStorage<string>
  maxCacheSizeInBytes: number
}): Promise<InMemoryCache> {
  const cache = setupCache()

  try {
    await persistCache({
      cache,
      storage,
      maxSize: maxCacheSizeInBytes
    })
  } catch (error) {
    logger.error(error, { tags: { file: 'cache.ts', function: 'initAndPersistCache' } })
  }

  return cache
}

export function setupCache(): InMemoryCache {
  return new InMemoryCache({})
}
