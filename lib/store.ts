import { useMemo } from 'react'
import browser from 'webextension-polyfill'

import { BaseStorage, Storage, StorageCallbackMap } from '@plasmohq/storage'
import { useStorage } from '@plasmohq/storage/hook'
import { SecureStorage } from '@plasmohq/storage/secure'

import {
  AsyncStorage,
  setLocalStore,
  setSecureLocalStore,
  setSecureSessionStore,
  setSessionStore
} from '~archmage/store'

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
  GAS_FEE_PREFIX = 'gasFee',
  NETWORK_TREE_STATE = 'networkTreeState',
  WALLET_TREE_STATE = 'walletTreeState'
}

export const LOCAL_STORE = new Storage({
  area: StoreArea.LOCAL
})
export const SECURE_LOCAL_STORE = new SecureStorage({
  area: StoreArea.LOCAL
})
export const SESSION_STORE = new Storage({
  area: StoreArea.SESSION
})
export const SECURE_SESSION_STORE = new SecureStorage({
  area: StoreArea.SESSION
})

export async function clearLocalStorage(keyPrefix: string) {
  for (const key of Object.keys(await browser.storage.local.get())) {
    if (key.startsWith(keyPrefix)) {
      await LOCAL_STORE.remove(key)
      await SECURE_LOCAL_STORE.remove(key)
    }
  }
}

export async function clearSessionStorage(keyPrefix: string) {
  for (const key of Object.keys(await (browser.storage as any).session.get())) {
    if (key.startsWith(keyPrefix)) {
      await SESSION_STORE.remove(key)
      await SECURE_SESSION_STORE.remove(key)
    }
  }
}

function _useStorage<T = any>(
  key: StoreKey | string,
  instance: BaseStorage,
  onInit?: T | ((v?: T) => T | Promise<T>)
) {
  const [renderValue, ...rest] = useStorage<T>(
    {
      key,
      instance
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
  return _useStorage(key, LOCAL_STORE, onInit)
}

export function useSecureLocalStorage<T = any>(
  key: StoreKey | string,
  onInit?: T | ((v?: T) => T | Promise<T>)
) {
  return _useStorage(key, SECURE_LOCAL_STORE, onInit)
}

export function useSessionStorage<T = any>(
  key: StoreKey | string,
  onInit?: T | ((v?: T) => T | Promise<T>)
) {
  return _useStorage(key, SESSION_STORE, onInit)
}

export function useSecureSessionStorage<T = any>(
  key: StoreKey | string,
  onInit?: T | ((v?: T) => T | Promise<T>)
) {
  return _useStorage(key, SECURE_SESSION_STORE, onInit)
}

export async function initStorage(password: string, clear = false) {
  if (clear) {
    await SECURE_LOCAL_STORE.clear(true)
    await SECURE_SESSION_STORE.clear(true)
  }
  await SECURE_LOCAL_STORE.setPassword(password)
  await SECURE_SESSION_STORE.setPassword(password)
}

setLocalStore(createStorage(LOCAL_STORE))
setSecureLocalStore(createStorage(SECURE_LOCAL_STORE))
setSessionStore(createStorage(SESSION_STORE))
setSecureSessionStore(createStorage(SECURE_SESSION_STORE))

function createStorage(store: BaseStorage): AsyncStorage {
  return {
    async getItem(key: string, initialValue: any) {
      return (await store.get<any>(key)) ?? initialValue
    },
    async setItem(key: string, newValue: any) {
      await store.set(key, newValue)
    },
    async removeItem(key: string) {
      await store.remove(key)
    },
    subscribe(key: string, callback: (value: string | null) => void) {
      const callbackMap: StorageCallbackMap = {
        [key]: ({ newValue }) => {
          callback(newValue !== undefined ? newValue : null)
        }
      }

      store.watch(callbackMap)

      return () => {
        store.unwatch(callbackMap)
      }
    }
  }
}
