import { decryptKeystore } from '@ethersproject/json-wallets'
import type { KeystoreAccount } from '@ethersproject/json-wallets/lib/keystore'

import { db } from '~lib/db'

export class Keystore {
  private accounts = new Map<number, KeystoreAccount>() // id -> decrypted keystore
  private ready = new Map<number, [Promise<unknown>, Function]>()

  async init() {
    await db.wallets.toCollection().eachPrimaryKey((id) => {
      this.initReady(id)
    })
  }

  async unlock(password: string) {
    // batch processing for memory efficiency
    const limit = 100
    for (let offset = 0; ; offset += limit) {
      const wallets = await db.wallets.offset(offset).limit(limit).toArray()
      if (!wallets.length) {
        break
      }
      for (const wallet of wallets) {
        // time-consuming decrypting
        const keystore = await decryptKeystore(wallet.keystore!, password)

        this.set(wallet.id!, keystore)
      }
    }
  }

  lock() {
    this.accounts.clear()
    for (const id of this.ready.keys()) {
      this.initReady(id)
    }
  }

  set(id: number, keystore: KeystoreAccount) {
    this.accounts.set(id, keystore)
    if (!this.ready.has(id)) {
      this.initReady(id)
    }
    this.resolveReady(id)
  }

  async get(id: number): Promise<KeystoreAccount | undefined> {
    await this.waitReady(id)
    return this.accounts.get(id)
  }

  private initReady(id: number) {
    let resolve
    const promise = new Promise((r) => {
      resolve = r
    })
    this.ready.set(id, [promise, resolve as any])
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

export const keystore = new Keystore()
