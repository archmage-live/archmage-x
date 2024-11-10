import { atomWithStorage, unwrap } from 'jotai/utils'

import { assert } from '@/archmage/errors'

export * from './keys'

type Unsubscribe = () => void

type Subscribe = (key: string, callback: (value: any) => void, initialValue: any) => Unsubscribe

export interface SyncStorage {
  getItem: (key: string, initialValue: any) => any
  setItem: (key: string, newValue: any) => void
  removeItem: (key: string) => void
  subscribe: Subscribe
}

export interface AsyncStorage {
  getItem: (key: string, initialValue: any) => PromiseLike<any>
  setItem: (key: string, newValue: any) => PromiseLike<void>
  removeItem: (key: string) => PromiseLike<void>
  subscribe: Subscribe
}

let localStore: SyncStorage | AsyncStorage
let secureLocalStore: SyncStorage | AsyncStorage
let sessionStore: SyncStorage | AsyncStorage
let secureSessionStore: SyncStorage | AsyncStorage

export function setLocalStore(store: SyncStorage | AsyncStorage) {
  assert(!localStore, 'localStore is already set')
  localStore = store
}

export function setSecureLocalStore(store: SyncStorage | AsyncStorage) {
  assert(!secureLocalStore, 'secureLocalStore is already set')
  secureLocalStore = store
}

export function setSessionStore(store: SyncStorage | AsyncStorage) {
  assert(!sessionStore, 'sessionStore is already set')
  sessionStore = store
}

export function setSecureSessionStore(store: SyncStorage | AsyncStorage) {
  assert(!secureSessionStore, 'secureSessionStore is already set')
  secureSessionStore = store
}

enum StorageType {
  LOCAL,
  SECURE_LOCAL,
  SESSION,
  SECURE_SESSION
}

function getStorage(type: StorageType) {
  switch (type) {
    case StorageType.LOCAL:
      return localStore
    case StorageType.SECURE_LOCAL:
      return secureLocalStore
    case StorageType.SESSION:
      return sessionStore
    case StorageType.SECURE_SESSION:
      return secureSessionStore
  }
}

function storageWrapper<Value>(type: StorageType) {
  return {
    getItem: async (key: string, initialValue: Value) => {
      return getStorage(type).getItem(key, initialValue)
    },
    setItem: async (key: string, newValue: Value) => {
      return getStorage(type).setItem(key, newValue)
    },
    removeItem: async (key: string) => {
      return getStorage(type).removeItem(key)
    },
    subscribe: (key: string, callback: (value: any) => void, initialValue: any) => {
      return getStorage(type).subscribe(key, callback, initialValue)
    }
  }
}

export const atomWithLocalStore = <T>(key: string, initialValue: T) =>
  unwrap(
    atomWithStorage<T>(key, initialValue, storageWrapper<T>(StorageType.LOCAL)),
    (prev) => prev
  )

export const atomWithSecureLocalStore = <T>(key: string, initialValue: T) =>
  unwrap(
    atomWithStorage<T>(key, initialValue, storageWrapper<T>(StorageType.SECURE_LOCAL)),
    (prev) => prev
  )

export const atomWithSessionStore = <T>(key: string, initialValue: T) =>
  unwrap(
    atomWithStorage<T>(key, initialValue, storageWrapper<T>(StorageType.SESSION)),
    (prev) => prev
  )

export const atomWithSecureSessionStore = <T>(key: string, initialValue: T) =>
  unwrap(
    atomWithStorage<T>(key, initialValue, storageWrapper<T>(StorageType.SECURE_SESSION)),
    (prev) => prev
  )
