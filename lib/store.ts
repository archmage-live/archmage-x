import { useMemo } from 'react'

import { Storage, StorageAreaName, useStorage } from '@plasmohq/storage'

export enum StoreArea {
  LOCAL = 'local',
  SESSION = 'session'
}

export enum StoreKey {
  PASSWORD_HASH = 'passwordHash',
  PASSWORD = 'password',
  LAST_UNLOCK_TIME = 'lastUnlockTime',
  AUTO_LOCK_TIME = 'autoLockTime',
  KEYSTORE_PREFIX = 'keystore',
  ACTIVE_NETWORK = 'activeNetwork',
  ACTIVE_WALLET = 'activeWallet',
  TOKEN_LISTS = 'tokenLists',
  CONSENT_REQUESTS = 'consentRequests'
}

function isKeySecret(key: StoreKey) {
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

function _useStorage<T = any>(
  key: StoreKey,
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
  key: StoreKey,
  onInit?: T | ((v?: T) => T | Promise<T>)
) {
  return _useStorage(key, StoreArea.LOCAL, onInit)
}

export function useSessionStorage<T = any>(
  key: StoreKey,
  onInit?: T | ((v?: T) => T | Promise<T>)
) {
  return _useStorage(key, StoreArea.SESSION, onInit)
}
