import { useMemo } from 'react'

import { Storage, useStorage } from '@plasmohq/storage'

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
  SELECTED_NETWORK = 'selectedNetwork',
  SELECTED_WALLET = 'selectedWallet',
  CONSENT_REQUESTS = 'consentRequests'
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

export function useLocalStorage<T = any>(
  key: StoreKey,
  onInit?: T | ((v?: T) => T | Promise<T>)
) {
  const [renderValue, ...rest] = useStorage(
    {
      key,
      area: StoreArea.LOCAL
    },
    onInit as any
  )
  const value = useMemo(
    () => (renderValue?.then ? undefined : renderValue),
    [renderValue]
  )
  return [value, ...rest] as const
}

export function useSessionStorage<T = any>(
  key: StoreKey,
  onInit?: T | ((v?: T) => T | Promise<T>)
) {
  const [renderValue, ...rest] = useStorage(
    {
      key,
      area: StoreArea.SESSION
    },
    onInit as any
  )
  const value = useMemo(
    () => (renderValue?.then ? undefined : renderValue),
    [renderValue]
  )
  return [value, ...rest] as const
}
