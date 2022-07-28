import { Storage } from '@plasmohq/storage'

export const STORE = new Storage({
  area: 'local'
})

export enum StoreKey {
  PASSWORD_HASH = 'password_hash'
}
