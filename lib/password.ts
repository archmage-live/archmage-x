import { sha256 } from '@ethersproject/sha2'

import { LOCAL_STORE, SESSION_STORE, StoreKey } from '~lib/store'

class Password {
  private password!: string

  async get() {
    if (!this.password) {
      this.password = await SESSION_STORE.get(StoreKey.PASSWORD)
    }
    return this.password
  }

  private async cache(password: string) {
    this.password = password
    if (password) {
      await SESSION_STORE.set(StoreKey.PASSWORD, password)
    } else {
      await SESSION_STORE.remove(StoreKey.PASSWORD)
    }
  }

  async create(password: string) {
    if (await this.exists()) {
      throw new Error('Password exists')
    }
    // persistent local
    await LOCAL_STORE.set(
      StoreKey.PASSWORD_HASH,
      sha256(new TextEncoder().encode(password))
    )
    // memory cache
    await this.cache(password)
  }

  async check(password: string): Promise<boolean> {
    return (
      sha256(new TextEncoder().encode(password)) ===
      (await LOCAL_STORE.get(StoreKey.PASSWORD_HASH))
    )
  }

  async exists() {
    return !!(
      (await this.get()) || (await LOCAL_STORE.get(StoreKey.PASSWORD_HASH))
    )
  }

  async isUnlocked() {
    return !!(await this.get())
  }

  async unlock(password: string) {
    if (!password) {
      return false
    }
    if (password === (await this.get())) {
      return true
    }
    if (!(await this.check(password))) {
      return false
    }
    await this.cache(password)

    return true
  }

  async lock() {
    await this.cache('')
  }
}

export const PASSWORD = new Password()
