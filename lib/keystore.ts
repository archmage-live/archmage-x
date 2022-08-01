import { decryptKeystore } from '@ethersproject/json-wallets'
import type { KeystoreAccount } from '@ethersproject/json-wallets/lib/keystore'
import browser from 'webextension-polyfill'

import { Storage } from '@plasmohq/storage'

import { DB } from '~lib/db'
import { PASSWORD } from '~lib/password'
import { SESSION_STORE, StoreKey } from '~lib/store'

class Accounts {
  private accounts = new Map<number, KeystoreAccount>() // id -> decrypted keystore

  async set(id: number, account: KeystoreAccount) {
    this.accounts.set(id, account)

    const key = `${StoreKey.KEYSTORE_PREFIX}_${id}`
    await new Storage({
      area: 'session',
      secretKeyList: [key]
    }).set(key, account)
  }

  async get(id: number): Promise<KeystoreAccount | undefined> {
    if (!this.accounts.has(id)) {
      const account = await SESSION_STORE.get<KeystoreAccount>(id.toString())

      if (account) {
        this.accounts.set(id, account)
      }
    }
    return this.accounts.get(id)
  }

  async clear() {
    this.accounts.clear()

    // TODO: session
    for (const key of Object.keys(
      await (browser.storage as any).session.get()
    )) {
      if (key.startsWith(StoreKey.KEYSTORE_PREFIX)) {
        await SESSION_STORE.remove(key)
      }
    }
  }
}

export class Keystore {
  private accounts = new Accounts()
  private ready = new Map<number, [Promise<unknown>, Function]>()

  async unlock() {
    const password = await PASSWORD.get()
    if (!password) {
      return
    }
    // batch processing for memory efficiency
    const limit = 100
    const concurrent = 2
    for (let offset = 0; ; offset += limit) {
      const wallets = await DB.wallets.offset(offset).limit(limit).toArray()
      if (!wallets.length) {
        break
      }
      for (let i = 0; i < wallets.length; i += concurrent) {
        const promises = []
        for (let j = i; j < i + concurrent && j < wallets.length; j++) {
          promises.push(this.fetch(wallets[j].id!))
        }
        await Promise.all(promises)
      }
    }
  }

  async lock() {
    await this.accounts.clear()
    for (const id of this.ready.keys()) {
      this.resolveReady(id)
    }
    this.ready.clear()
  }

  async set(id: number, keystore: KeystoreAccount) {
    await this.accounts.set(id, keystore)
  }

  async get(id: number): Promise<KeystoreAccount | undefined> {
    return await this.fetch(id)
  }

  private async fetch(id: number): Promise<KeystoreAccount | undefined> {
    const account = await this.accounts.get(id)
    if (account) {
      return account
    }
    if (!this.hasReady(id)) {
      this.initReady(id)

      const wallet = await DB.wallets.get(id)
      if (!wallet) {
        this.resolveReady(id)
        return undefined
      }

      const password = await PASSWORD.get()
      if (!password) {
        return undefined
      }

      // time-consuming decrypting
      const keystore = await decryptKeystore(wallet.keystore!, password)
      await this.accounts.set(id, keystore)

      this.resolveReady(id)

      return keystore
    } else {
      await this.waitReady(id)
      return await this.accounts.get(id)
    }
  }

  private initReady(id: number) {
    let resolve
    const promise = new Promise((r) => {
      resolve = r
    })
    this.ready.set(id, [promise, resolve as any])
  }

  private hasReady(id: number) {
    return this.ready.has(id)
  }

  private async waitReady(id: number) {
    const ready = this.ready.get(id)
    if (ready) {
      await ready[0]
    }
  }

  private resolveReady(id: number) {
    const ready = this.ready.get(id)
    if (ready) {
      ready[1]()
    }
  }
}

// Global keystore singleton
export const KEYSTORE = new Keystore()
