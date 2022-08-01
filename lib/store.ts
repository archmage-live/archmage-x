import { Storage } from '@plasmohq/storage'

export enum StoreKey {
  PASSWORD_HASH = 'password_hash',
  PASSWORD = 'password',
  KEYSTORE_PREFIX = 'keystore'
}

export const LOCAL_STORE = new Storage({
  area: 'local',
  secretKeyList: [StoreKey.PASSWORD_HASH]
})

export const SESSION_STORE = new Storage({
  area: 'session',
  secretKeyList: [StoreKey.PASSWORD]
})
