import { useMemo } from 'react'
import browser from 'webextension-polyfill'

import { Storage, StorageAreaName, useStorage } from '@plasmohq/storage'

export enum StoreArea {
  LOCAL = 'local',
  SESSION = 'session'
}

export enum StoreKey {
  PASSWORD_HASH = 'passwordHash',
  PASSWORD = 'password',
  KEYSTORE_PREFIX = 'keystore',
  KEYLESS_PREFIX = 'keyless',
  LAST_UNLOCK_TIME = 'lastUnlockTime',
  AUTO_LOCK_TIME = 'autoLockTime',
  NETWORK_KINDS = 'networkKinds',
  ACTIVE_NETWORK = 'activeNetwork',
  ACTIVE_WALLET = 'activeWallet',
  TOKEN_LISTS = 'tokenLists',
  CONSENT_REQUESTS = 'consentRequests',
  GAS_FEE_PREFIX = 'gasFee'
}

function isKeySecret(key: StoreKey | string) {
  switch (key) {
    case StoreKey.PASSWORD_HASH:
    case StoreKey.PASSWORD:
      return true
  }
  return false
}

// local persistent
export const LOCAL_STORE = new Storage({
  area: StoreArea.LOCAL,
  secretKeyList: [StoreKey.PASSWORD_HASH]
})

// memory cached
export const SESSION_STORE = new Storage({
  area: StoreArea.SESSION,
  secretKeyList: [StoreKey.PASSWORD]
})

export async function clearLocalStorage(keyPrefix: string) {
  for (const key of Object.keys(await browser.storage.local.get())) {
    if (key.startsWith(keyPrefix)) {
      await LOCAL_STORE.remove(key)
    }
  }
}

export async function clearSessionStorage(keyPrefix: string) {
  for (const key of Object.keys(await (browser.storage as any).session.get())) {
    if (key.startsWith(keyPrefix)) {
      await SESSION_STORE.remove(key)
    }
  }
}

function _useStorage<T = any>(
  key: StoreKey | string,
  area: StorageAreaName,
  onInit?: T | ((v?: T) => T | Promise<T>)
) {
  const [renderValue, ...rest] = useStorage<T>(
    {
      key,
      area,
      isSecret: isKeySecret(key)
    },
    onInit as any
  )
  const value = useMemo(
    () => ((renderValue as any)?.then ? undefined : renderValue),
    [renderValue]
  )
  return [value, ...rest] as const
}

export function useLocalStorage<T = any>(
  key: StoreKey | string,
  onInit?: T | ((v?: T) => T | Promise<T>)
) {
  return _useStorage(key, StoreArea.LOCAL, onInit)
}

export function useSessionStorage<T = any>(
  key: StoreKey | string,
  onInit?: T | ((v?: T) => T | Promise<T>)
) {
  return _useStorage(key, StoreArea.SESSION, onInit)
}
