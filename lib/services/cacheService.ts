import assert from 'assert'
import { useEffect, useState } from 'react'
import { useAsync } from 'react-use'
// @ts-ignore
import stableHash from 'stable-hash'

import { DB } from '~lib/db'
import { ICache } from '~lib/schema'

type Key = any

function cacheCriteria(
  category: CacheCategory,
  key1?: Key | null,
  key2?: Key | null,
  key3?: Key | null
): [string, string | string[]] {
  if (key1 === undefined) {
    return ['category', category]
  } else if (key2 === undefined) {
    return ['[category+key1]', [category, formatKey(key1 || '')]]
  } else if (key3 === undefined) {
    return [
      '[category+key1+key2]',
      [category, formatKey(key1 || ''), formatKey(key2 || '')]
    ]
  } else {
    return [
      '[category+key1+key2+key3]',
      [
        category,
        formatKey(key1 || ''),
        formatKey(key2 || ''),
        formatKey(key3 || '')
      ]
    ]
  }
}

function formatKey(key: Key) {
  switch (typeof key) {
    case 'string':
      return key
    case 'number':
      return String(key)
    case 'boolean':
      return String(key)
    case 'object':
      return stableHash(key)
    default:
      throw new Error(`formatKey, invalid key: ${key}`)
  }
}

export enum CacheCategory {
  FETCH = 'fetch',
  PROVIDER = 'provider',
  CRYPTO_COMPARE = 'cryptoCompare'
}

class CacheService {
  private async _getCaches(category: CacheCategory, key1?: Key, key2?: Key) {
    const [criteria, value] = cacheCriteria(category, key1, key2)
    return DB.cache.where(criteria).equals(value).toArray()
  }

  private async _getCachesByKeys(
    category: CacheCategory,
    key1?: Key | Key[],
    key2?: Key | Key[],
    key3?: Key[]
  ) {
    if (Array.isArray(key1)) {
      const key1s = key1.map(formatKey)

      const caches = await DB.cache
        .where('[category+key1]')
        .anyOf(key1s.map((key1) => [category, key1]))
        .toArray()

      const cacheMap = new Map(caches.map((item) => [item.key1, item.data]))

      return key1s.map((key1) => cacheMap.get(key1))
    } else if (Array.isArray(key2)) {
      assert(key1 !== undefined)
      key1 = formatKey(key1)
      const key2s = key2.map(formatKey)

      const caches = await DB.cache
        .where('[category+key1+key2]')
        .anyOf(key2s.map((key2) => [category, key1, key2]))
        .toArray()

      const cacheMap = new Map(caches.map((item) => [item.key2, item.data]))

      return key2s.map((key2) => cacheMap.get(key2))
    } else if (Array.isArray(key3)) {
      assert(key1 !== undefined && key2 !== undefined)
      key1 = formatKey(key1)
      key2 = formatKey(key2)
      const key3s = key3.map(formatKey)

      const caches = await DB.cache
        .where('[category+key1+key2+key3]')
        .anyOf(key3s.map((key3) => [category, key1, key2, key3]))
        .toArray()

      const cacheMap = new Map(caches.map((item) => [item.key3, item.data]))

      return key3s.map((key3) => cacheMap.get(key3))
    } else {
      throw new Error('_getCachesByKeys, invalid params')
    }
  }

  private async _getCache(
    category: CacheCategory,
    key1: Key,
    key2: Key,
    key3: Key
  ) {
    const [criteria, value] = cacheCriteria(category, key1, key2, key3)
    return DB.cache.where(criteria).equals(value).first()
  }

  private async _setCaches(
    category: CacheCategory,
    caches: [Key, Key, Key, any][]
  ) {
    caches = caches.map(([key1, key2, key3, data]) => [
      formatKey(key1),
      formatKey(key2),
      formatKey(key3),
      data
    ])

    await DB.transaction('rw', [DB.cache], async () => {
      const existing = await DB.cache
        .where('[category+key1+key2+key3]')
        .anyOf(caches.map((item) => [category, ...item.slice(0, 3)]))
        .toArray()
      const existingMap = new Map(
        existing.map((item) => [`${item.key1}-${item.key2}-${item.key3}`, item])
      )

      const bulkAdd = []
      const bulkUpdate = []
      const cachedAt = Date.now()
      for (const [key1, key2, key3, data] of caches) {
        const existing = existingMap.get(`${key1}-${key2}-${key3}`)
        if (existing) {
          bulkUpdate.push({ ...existing, data, cachedAt } as ICache)
        } else {
          bulkAdd.push({ category, key1, key2, key3, data, cachedAt } as ICache)
        }
      }

      if (bulkAdd.length) {
        await DB.cache.bulkAdd(bulkAdd)
      }
      if (bulkUpdate.length) {
        await DB.cache.bulkPut(bulkUpdate)
      }
    })
  }

  private async _setCache(
    category: CacheCategory,
    key1: Key,
    key2: Key,
    key3: Key,
    data: any
  ) {
    await DB.transaction('rw', [DB.cache], async () => {
      const [criteria, value] = cacheCriteria(category, key1, key2, key3)
      const existing = await DB.cache.where(criteria).equals(value).first()
      if (existing) {
        await DB.cache.update(existing.id, { data, cachedAt: Date.now() })
      } else {
        const cache = {
          category,
          key1: formatKey(key1),
          key2: formatKey(key2),
          key3: formatKey(key3),
          data,
          cachedAt: Date.now()
        } as ICache
        await DB.cache.add(cache)
      }
    })
  }

  async getCaches(category: CacheCategory) {
    return this._getCaches(category)
  }

  async getCaches1(category: CacheCategory, key1: Key) {
    return this._getCaches(category, key1)
  }

  async getCaches2(category: CacheCategory, key1: Key, key2: Key) {
    return this._getCaches(category, key1, key2)
  }

  async getCachesByKeys1(category: CacheCategory, key1: Key[]) {
    return this._getCachesByKeys(category, key1)
  }

  async getCachesByKeys2(category: CacheCategory, key1: Key, key2: Key[]) {
    return this._getCachesByKeys(category, key1, key2)
  }

  async getCachesByKeys3(
    category: CacheCategory,
    key1: Key,
    key2: Key,
    key3: Key[]
  ) {
    return this._getCachesByKeys(category, key1, key2, key3)
  }

  async getCache(category: CacheCategory) {
    return this._getCache(category, '', '', '')
  }

  async getCache1(category: CacheCategory, key1: Key) {
    return this._getCache(category, key1, '', '')
  }

  async getCache2(category: CacheCategory, key1: Key, key2: Key) {
    return this._getCache(category, key1, key2, '')
  }

  async getCache3(category: CacheCategory, key1: Key, key2: Key, key3: Key) {
    return this._getCache(category, key1, key2, key3)
  }

  async setCaches1(category: CacheCategory, caches: [Key, any][]) {
    await this._setCaches(
      category,
      caches.map(([key1, data]) => [key1, '', '', data])
    )
  }

  async setCaches2(category: CacheCategory, caches: [Key, Key, any][]) {
    await this._setCaches(
      category,
      caches.map(([key1, key2, data]) => [key1, key2, '', data])
    )
  }

  async setCaches3(category: CacheCategory, caches: [Key, Key, Key, any][]) {
    await this._setCaches(category, caches)
  }

  async setCache(category: CacheCategory, data: any) {
    await this._setCache(category, '', '', '', data)
  }

  async setCache1(category: CacheCategory, key1: Key, data: any) {
    await this._setCache(category, key1, '', '', data)
  }

  async setCache2(category: CacheCategory, key1: Key, key2: Key, data: any) {
    await this._setCache(category, key1, key2, '', data)
  }

  async setCache3(
    category: CacheCategory,
    key1: Key,
    key2: Key,
    key3: Key,
    data: any
  ) {
    await this._setCache(category, key1, key2, key3, data)
  }
}

export const CACHE_SERVICE = new CacheService()

export function useCache_(
  category: CacheCategory,
  key1?: Key,
  key2?: Key,
  key3?: Key,
  data?: any
): any | undefined {
  const { value } = useAsync(async () => {
    if (key1 === undefined || key2 === undefined || key3 === undefined) {
      return
    }

    if (data !== undefined) {
      await CACHE_SERVICE.setCache3(category, key1, key2, key3, data)
    }

    const cache = await CACHE_SERVICE.getCache3(category, key1, key2, key3)
    return cache?.data
  }, [category, key1, key2, key3, data])
  return value
}

export function useCaches_(
  category: CacheCategory,
  key1?: Key | Key[],
  key2?: Key | Key[],
  key3?: Key[],
  data?: any[]
): Map<Key, any> | undefined {
  const { value } = useAsync(async () => {
    if (Array.isArray(key1)) {
      if (data) {
        assert(key1.length === data.length)
        const add = data
          .map((data, i) => [key1[i], data] as [Key, any])
          .filter(([key1, data]) => key1 !== undefined && data !== undefined)
        if (add.length) {
          await CACHE_SERVICE.setCaches1(category, add)
        }
      }

      const key1s = key1.filter((key1) => key1 !== undefined)

      const result = await CACHE_SERVICE.getCachesByKeys1(category, key1s)
      return new Map(key1s.map((key1, i) => [key1, result[i]]))
    } else if (Array.isArray(key2)) {
      if (key1 === undefined) {
        return
      }

      if (data) {
        assert(key2.length === data.length)
        const add = data
          .map((data, i) => [key1, key2[i], data] as [Key, Key, any])
          .filter(
            ([key1, key2, data]) =>
              key1 !== undefined && key2 !== undefined && data !== undefined
          )
        if (add.length) {
          await CACHE_SERVICE.setCaches2(category, add)
        }
      }

      const key2s = key2.filter((key2) => key2 !== undefined)

      const result = await CACHE_SERVICE.getCachesByKeys2(category, key1, key2s)
      return new Map(key2s.map((key2, i) => [key2, result[i]]))
    } else {
      if (key1 === undefined || key2 === undefined || key3 === undefined) {
        return
      }

      if (data) {
        assert(key3.length === data.length)
        const add = data
          .map((data, i) => [key1, key2, key3[i], data] as [Key, Key, Key, any])
          .filter(
            ([key1, key2, key3, data]) =>
              key1 !== undefined &&
              key2 !== undefined &&
              key3 !== undefined &&
              data !== undefined
          )
        if (add.length) {
          await CACHE_SERVICE.setCaches3(category, add)
        }
      }

      const key3s = key3.filter((key3) => key3 !== undefined)

      const result = await CACHE_SERVICE.getCachesByKeys3(
        category,
        key1,
        key2,
        key3s
      )
      return new Map(key3s.map((key3, i) => [key3, result[i]]))
    }
  }, [category, key1, key2, key3, data])

  return value
}

export function useCache(category: CacheCategory, data?: any) {
  return useCache_(category, '', '', '', data)
}

export function useCache1(category: CacheCategory, key1?: Key, data?: any) {
  return useCache_(category, key1, '', '', data)
}

export function useCache2(
  category: CacheCategory,
  key1?: Key,
  key2?: Key,
  data?: any
) {
  return useCache_(category, key1, key2, '', data)
}

export function useCache3(
  category: CacheCategory,
  key1?: Key,
  key2?: Key,
  key3?: Key,
  data?: any
) {
  return useCache_(category, key1, key2, key3, data)
}

export function useCachesByKeys1(
  category: CacheCategory,
  key1?: Key[],
  data?: any[]
) {
  return useCaches_(category, key1, undefined, undefined, data)
}

export function useCachesByKeys2(
  category: CacheCategory,
  key1?: Key,
  key2?: Key[],
  data?: any[]
) {
  return useCaches_(category, key1, key2, undefined, data)
}

export function useCachesByKeys3(
  category: CacheCategory,
  key1?: Key,
  key2?: Key,
  key3?: Key[],
  data?: any[]
) {
  return useCaches_(category, key1, key2, key3, data)
}
