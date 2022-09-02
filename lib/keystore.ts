import { decryptKeystore, encryptKeystore } from '@ethersproject/json-wallets'
import type { KeystoreAccount } from '@ethersproject/json-wallets/lib/keystore'
import browser from 'webextension-polyfill'

import { Storage } from '@plasmohq/storage'

import { DB } from '~lib/db'
import { ENV } from '~lib/env'
import { PASSWORD } from '~lib/password'
import { IWallet } from '~lib/schema/wallet'
import { SESSION_STORE, StoreKey } from '~lib/store'
import { hasWalletKeystore } from "~lib/wallet";

function keystoreKey(id: number): string {
  return `${StoreKey.KEYSTORE_PREFIX}_${id}`
}

class Accounts {
  private accounts = new Map<number, KeystoreAccount>() // id -> decrypted keystore

  async set(id: number, account: KeystoreAccount) {
    this.accounts.set(id, account)

    const key = keystoreKey(id)
    await new Storage({
      area: 'session',
      secretKeyList: [key]
    }).set(key, account)
  }

  async get(id: number): Promise<KeystoreAccount | undefined> {
    if (!this.accounts.has(id)) {
      const account = await SESSION_STORE.get<KeystoreAccount>(keystoreKey(id))

      if (account) {
        this.accounts.set(id, account)
      }
    }
    return this.accounts.get(id)
  }

  async remove(id: number) {
    this.accounts.delete(id)
    await SESSION_STORE.remove(keystoreKey(id))
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

  constructor() {
    this.unlock()
  }

  async unlock() {
    if (!ENV.inServiceWorker) {
      return
    }
    const password = await PASSWORD.get()
    if (!password) {
      return
    }
    // batch processing for memory efficiency
    const limit = 100
    const concurrent = 4
    for (let offset = 0; ; offset += limit) {
      const wallets = await DB.wallets.offset(offset).limit(limit).toArray()
      if (!wallets.length) {
        break
      }

      if (await PASSWORD.isLocked()) {
        break
      }

      for (let i = 0; i < wallets.length; i += concurrent) {
        const promises = []
        for (let j = i; j < i + concurrent && j < wallets.length; j++) {
          const wallet = wallets[j]

          if (!hasWalletKeystore(wallet.type)) {
            continue
          }

          if (!wallet.keystore) {
            promises.push(this.persist(wallet))
          }

          promises.push(this.fetch(wallet.id))
        }

        await Promise.all(promises)

        if (await PASSWORD.isLocked()) {
          break
        }
      }
    }

    console.log('Unlock keystore succeeded')
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

  async persist(wallet: IWallet) {
    if (!hasWalletKeystore(wallet.type)) {
      return
    }
    if (wallet.keystore) {
      // has persisted
      return
    }
    const account = await this.accounts.get(wallet.id)
    const password = await PASSWORD.get()
    if (!account) {
      await DB.wallets.delete(wallet.id)
      console.log(
        `keystore for wallet ${wallet.id} cannot be recovered anymore, so delete it`
      )
      return
    }
    if (!password) {
      // maybe locked, so it will be recovered next time
      return
    }
    // time-consuming encrypting
    wallet.keystore = await encryptKeystore(account, password, {
      scrypt: {
        N: undefined
        // N: 1 << 14 // fast
      }
    })
    await DB.wallets.update(wallet.id, { keystore: wallet.keystore })
    console.log(`keystore for wallet ${wallet.id} is persistent`)
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
        this.resolveReady(id, true)
        return undefined
      }

      const password = await PASSWORD.get()
      if (!password) {
        this.resolveReady(id, true)
        return undefined
      }

      // time-consuming decrypting
      const keystore = await decryptKeystore(wallet.keystore!, password)
      await this.accounts.set(id, keystore)

      if (await PASSWORD.isLocked()) {
        await this.accounts.remove(id)
        this.resolveReady(id, true)
        return undefined
      }

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

  private resolveReady(id: number, remove?: boolean) {
    const ready = this.ready.get(id)
    if (ready) {
      ready[1]()
    }
    if (remove) {
      this.ready.delete(id)
    }
  }
}

// Global keystore singleton
export const KEYSTORE = new Keystore()
