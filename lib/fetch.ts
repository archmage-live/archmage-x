import { _fetchData, fetchJson as fetch } from '@ethersproject/web'
import { ConnectionInfo, FetchJsonResponse } from '@ethersproject/web/src.ts'

import { IFetchCache } from '~lib/schema'

import { DB } from './db'

export async function fetchData<T = Uint8Array>(
  connection: string | ConnectionInfo,
  body?: Uint8Array,
  processFunc?: (value: Uint8Array, response: FetchJsonResponse) => T
): Promise<T> {
  return _fetchData(connection, body, processFunc)
}

export async function fetchJson(
  connection: string | ConnectionInfo,
  json?: string,
  processFunc?: (value: any, response: FetchJsonResponse) => any
): Promise<any> {
  return fetch(connection, json, processFunc)
}

export async function fetchDataWithCache<T = Uint8Array>(
  connection: string | ConnectionInfo,
  cacheTime?: number,
  processFunc?: (value: Uint8Array, response: FetchJsonResponse) => T
): Promise<T> {
  const url = typeof connection === 'string' ? connection : connection.url
  const cache = await DB.fetchCache.where('url').equals(url).first()
  if (
    cache &&
    (cacheTime === undefined || Date.now() - cache.cachedAt <= cacheTime)
  ) {
    return cache.response
  }

  const response = await fetchData(connection, undefined, processFunc)
  await DB.fetchCache.put({
    id: cache && cache.id, // add or update
    url,
    response,
    cachedAt: Date.now()
  } as IFetchCache)
  return response
}

export async function fetchJsonWithCache(
  connection: string | ConnectionInfo,
  cacheTime?: number,
  processFunc?: (value: any, response: FetchJsonResponse) => any
): Promise<any> {
  const url = typeof connection === 'string' ? connection : connection.url
  const cache = await DB.fetchCache.where('url').equals(url).first()
  if (
    cache &&
    (cacheTime === undefined || Date.now() - cache.cachedAt <= cacheTime)
  ) {
    return cache.response
  }

  const response = await fetchJson(connection, undefined, processFunc)
  await DB.fetchCache.put({
    id: cache && cache.id, // add or update
    url,
    response,
    cachedAt: Date.now()
  } as IFetchCache)
  return response
}
