import { Storage } from '@plasmohq/storage'

export enum StoreArea {
  LOCAL = 'local',
  SESSION = 'session'
}

export enum StoreKey {
  PASSWORD_HASH = 'password_hash',
  PASSWORD = 'password',
  LAST_UNLOCK_TIME = 'lastUnlockTime',
  AUTO_LOCK_TIME = 'autoLockTime',
  KEYSTORE_PREFIX = 'keystore'
}

// local persistent
export const LOCAL_STORE = new Storage({
  area: 'local',
  secretKeyList: [StoreKey.PASSWORD_HASH]
})

// memory cached
export const SESSION_STORE = new Storage({
  area: 'session',
  secretKeyList: [StoreKey.PASSWORD]
})
