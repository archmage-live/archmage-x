import { decryptKeystore, encryptKeystore } from '@ethersproject/json-wallets'
import type { KeystoreAccount } from '@ethersproject/json-wallets/lib/keystore'
import browser from 'webextension-polyfill'

import { Storage } from '@plasmohq/storage'

import { DB } from '~lib/db'
import { ENV } from '~lib/env'
import { PASSWORD } from '~lib/password'
import { IKeystore, Index, PSEUDO_INDEX } from '~lib/schema'
import { IWallet } from '~lib/schema/wallet'
import { WALLET_SERVICE } from '~lib/services/wallet'
import { SESSION_STORE, StoreKey } from '~lib/store'
import { WalletType, hasWalletKeystore } from '~lib/wallet'

function keystoreKey(id: number, index: Index): string {
  return index === PSEUDO_INDEX
    ? `${StoreKey.KEYSTORE_PREFIX}_${id}`
    : `${StoreKey.KEYSTORE_PREFIX}_${id}_${index}`
}

function readyKey(id: number, index: Index): string {
  return index === PSEUDO_INDEX ? `${id}` : `${id}_${index}`
}

class Accounts {
  private accounts = new Map<string, KeystoreAccount>() // key -> decrypted keystore

  async set(id: number, index: Index, account: KeystoreAccount) {
    const key = keystoreKey(id, index)
    this.accounts.set(key, account)

    await new Storage({
      area: 'session',
      secretKeyList: [key]
    }).set(key, account)
  }

  async get(id: number, index: Index): Promise<KeystoreAccount | undefined> {
    const key = keystoreKey(id, index)
    if (!this.accounts.has(key)) {
      const account = await SESSION_STORE.get<KeystoreAccount>(key)

      if (account) {
        this.accounts.set(key, account)
      }
    }
    return this.accounts.get(key)
  }

  async remove(id: number, index: Index) {
    const key = keystoreKey(id, index)
    this.accounts.delete(key)
    await SESSION_STORE.remove(key)
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
  private ready = new Map<string, [Promise<unknown>, Function]>()

  constructor() {
    this.unlock().then()
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

          let indices: Index[]
          if (wallet.type === WalletType.PRIVATE_KEY_GROUP) {
            const subWallets = await WALLET_SERVICE.getSubWallets(wallet.id)
            indices = subWallets.map(({ index }) => index)
          } else {
            indices = [PSEUDO_INDEX]
          }

          for (const index of indices) {
            if (!(await this.getKeystore(wallet, index))) {
              promises.push(this.persist(wallet, index))
            }

            promises.push(this.fetch(wallet.id, index))
          }
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
    for (const key of this.ready.keys()) {
      this.resolveReadyByKey(key)
    }
    this.ready.clear()
  }

  async set(id: number, index: Index, keystore: KeystoreAccount) {
    await this.accounts.set(id, index, keystore)
  }

  async get(
    id: number,
    index: Index | undefined,
    waitForUnlock = false
  ): Promise<KeystoreAccount | undefined> {
    while (true) {
      const account = await this.fetch(
        id,
        typeof index === 'number' ? index : PSEUDO_INDEX
      )
      if (!account && waitForUnlock) {
        if (await PASSWORD.isLocked()) {
          await PASSWORD.waitForUnlocked()
          continue
        }
      }
      return account
    }
  }

  async remove(id: number, index: Index) {
    await this.accounts.remove(id, index)
    this.resolveReady(id, index, true)
  }

  async persist(wallet: IWallet, index: Index) {
    if (!hasWalletKeystore(wallet.type)) {
      return
    }

    if (await this.getKeystore(wallet, index)) {
      // has persisted
      return
    }

    const account = await this.accounts.get(wallet.id, index)
    const password = await PASSWORD.get()
    if (!account) {
      if (index === PSEUDO_INDEX) {
        await WALLET_SERVICE.deleteWallet(wallet.id)
        console.log(
          `keystore for wallet ${wallet.id} cannot be recovered anymore, so delete it`
        )
      } else {
        await WALLET_SERVICE.deleteSubWallet({ masterId: wallet.id, index })
        console.log(
          `keystore for sub wallet ${wallet.id}/${index} cannot be recovered anymore, so delete it`
        )
      }
      return
    }
    if (!password) {
      // maybe locked, so it will be recovered next time
      return
    }

    // time-consuming encrypting
    const keystore = await encryptKeystore(account, password, {
      scrypt: {
        N: undefined
        // N: 1 << 14 // fast
      }
    })

    await DB.transaction('rw', [DB.keystores], async () => {
      if (await this.getKeystore(wallet, index)) {
        return
      }

      await DB.keystores.add({
        masterId: wallet.id,
        index,
        keystore
      } as IKeystore)
    })

    if (index === PSEUDO_INDEX) {
      console.log(`keystore for wallet ${wallet.id} is persistent`)
    } else {
      console.log(`keystore for sub wallet ${wallet.id}/${index} is persistent`)
    }
  }

  private async fetch(
    id: number,
    index: Index
  ): Promise<KeystoreAccount | undefined> {
    const account = await this.accounts.get(id, index)
    if (account) {
      return account
    }
    if (!this.hasReady(id, index)) {
      this.initReady(id, index)

      const wallet = await DB.wallets.get(id)
      if (!wallet) {
        this.resolveReady(id, index, true)
        return undefined
      }

      const password = await PASSWORD.get()
      if (!password) {
        this.resolveReady(id, index, true)
        return undefined
      }

      const encrypt = await this.getKeystore(wallet, index)
      if (!encrypt) {
        this.resolveReady(id, index, true)
        return undefined
      }

      // time-consuming decrypting
      const keystore = await decryptKeystore(encrypt.keystore, password)
      await this.accounts.set(id, index, keystore)

      if (await PASSWORD.isLocked()) {
        await this.remove(id, index)
        return undefined
      }

      this.resolveReady(id, index)

      return keystore
    } else {
      await this.waitReady(id, index)
      return await this.accounts.get(id, index)
    }
  }

  private initReady(id: number, index: Index) {
    let resolve
    const promise = new Promise((r) => {
      resolve = r
    })
    this.ready.set(readyKey(id, index), [promise, resolve as any])
  }

  private hasReady(id: number, index: Index) {
    return this.ready.has(readyKey(id, index))
  }

  private async waitReady(id: number, index: Index) {
    const ready = this.ready.get(readyKey(id, index))
    if (ready) {
      await ready[0]
    }
  }

  private resolveReady(id: number, index: Index, remove?: boolean) {
    this.resolveReadyByKey(readyKey(id, index), remove)
  }

  private resolveReadyByKey(key: string, remove?: boolean) {
    const ready = this.ready.get(key)
    if (ready) {
      ready[1]()
    }
    if (remove) {
      this.ready.delete(key)
    }
  }

  private async getKeystore(wallet: IWallet, index: Index) {
    return DB.keystores
      .where({
        masterId: wallet.id,
        index
      })
      .first()
  }
}

// Global keystore singleton
export const KEYSTORE = new Keystore()
