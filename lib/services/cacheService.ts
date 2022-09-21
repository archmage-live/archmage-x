import assert from 'assert'
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
  CRYPTO_COMPARE = 'cryptoCompare',
  COIN_GECKO = 'coinGecko'
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
      const key1Map = new Map(key1s.map((key1Str, i) => [key1Str, key1[i]]))

      const caches = await DB.cache
        .where('[category+key1]')
        .anyOf(key1s.map((key1) => [category, key1]))
        .toArray()

      return new Map(caches.map((item) => [key1Map.get(item.key1), item.data]))
    } else if (Array.isArray(key2)) {
      assert(key1 !== undefined)
      key1 = formatKey(key1)
      const key2s = key2.map(formatKey)
      const key2Map = new Map(key2s.map((key2Str, i) => [key2Str, key2[i]]))

      const caches = await DB.cache
        .where('[category+key1+key2]')
        .anyOf(key2s.map((key2) => [category, key1, key2]))
        .toArray()

      return new Map(caches.map((item) => [key2Map.get(item.key2), item.data]))
    } else if (Array.isArray(key3)) {
      assert(key1 !== undefined && key2 !== undefined)
      key1 = formatKey(key1)
      key2 = formatKey(key2)
      const key3s = key3.map(formatKey)
      const key3Map = new Map(key3s.map((key3Str, i) => [key3Str, key3[i]]))

      const caches = await DB.cache
        .where('[category+key1+key2+key3]')
        .anyOf(key3s.map((key3) => [category, key1, key2, key3]))
        .toArray()

      return new Map(caches.map((item) => [key3Map.get(item.key3), item.data]))
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
  key1s?: Key[],
  dataByKey1?: Map<Key, any | undefined>
) {
  const { value } = useAsync(async () => {
    if (!key1s) {
      return
    }

    if (dataByKey1) {
      const add = []
      for (const [key1, data] of dataByKey1.entries()) {
        assert(key1 !== undefined)
        if (data !== undefined) {
          add.push([key1, data] as [Key, any])
        }
      }

      if (add.length) {
        await CACHE_SERVICE.setCaches1(category, add)
      }
    }

    return await CACHE_SERVICE.getCachesByKeys1(category, key1s)
  }, [category, key1s, dataByKey1])

  return value
}

export function useCachesByKeys2(
  category: CacheCategory,
  key1?: Key,
  key2s?: Key[],
  dataByKey2?: Map<Key, any | undefined>
) {
  const { value } = useAsync(async () => {
    if (key1 === undefined || !key2s) {
      return
    }

    if (dataByKey2) {
      const add = []
      for (const [key2, data] of dataByKey2.entries()) {
        assert(key2 !== undefined)
        if (data !== undefined) {
          add.push([key1, key2, data] as [Key, Key, any])
        }
      }

      if (add.length) {
        await CACHE_SERVICE.setCaches2(category, add)
      }
    }

    return await CACHE_SERVICE.getCachesByKeys2(category, key1, key2s)
  }, [category, key1, key2s, dataByKey2])

  return value
}

export function useCachesByKeys3(
  category: CacheCategory,
  key1?: Key,
  key2?: Key,
  key3s?: Key[],
  dataByKey3?: Map<Key, any | undefined>
) {
  const { value } = useAsync(async () => {
    if (key1 === undefined || key2 === undefined || !key3s) {
      return
    }

    if (dataByKey3) {
      const add = []
      for (const [key3, data] of dataByKey3.entries()) {
        assert(key3 !== undefined)
        if (data !== undefined) {
          add.push([key1, key2, key3, data] as [Key, Key, Key, any])
        }
      }

      if (add.length) {
        await CACHE_SERVICE.setCaches3(category, add)
      }
    }

    return await CACHE_SERVICE.getCachesByKeys3(category, key1, key2, key3s)
  }, [category, key1, key2, key3s, dataByKey3])

  return value
}
