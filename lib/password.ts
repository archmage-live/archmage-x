import { sha256 } from '@ethersproject/sha2'
import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAsync } from 'react-use'

import { StorageCallbackMap } from '@plasmohq/storage'

import { isBackgroundWorker } from '~lib/detect'
import { useSubWalletsCount } from '~lib/services/wallet'
import {
  LOCAL_STORE,
  SESSION_STORE,
  StoreKey,
  initStorage,
  useLocalStorage,
  useSessionStorage
} from '~lib/store'

class Password {
  private password?: string

  constructor(private cacheInMemory: boolean) {}

  async get() {
    if (!this.password) {
      const password = await SESSION_STORE.get(StoreKey.PASSWORD)
      if (!this.cacheInMemory) {
        return password
      }
      this.password = password
    }
    return this.password
  }

  private async cache(password: string) {
    if (this.cacheInMemory) {
      this.password = password
    }
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
    // initialize storage
    await initStorage(password, true)
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

  async isLocked() {
    return !(await this.get())
  }

  async isUnlocked() {
    return !(await this.isLocked())
  }

  async waitForUnlocked() {
    let resolve: Function
    const promise = new Promise((r) => {
      resolve = r
    })

    const unwatch = watchPasswordUnlocked((isUnlocked) => {
      if (isUnlocked) {
        resolve()
      }
    })

    await promise

    unwatch()
  }

  async unlock(password: string) {
    if (!password) {
      return false
    }

    if (await this.isUnlocked()) {
      throw new Error('Already unlocked')
    }

    if (!(await this.check(password))) {
      return false
    }

    await this.cache(password)

    await initStorage(password)

    return true
  }

  async lock() {
    await this.cache('')
  }
}

export const PASSWORD = new Password(isBackgroundWorker())

export function watchPasswordUnlocked(handler: (isUnlocked: boolean) => void) {
  const callbackMap: StorageCallbackMap = {
    [StoreKey.PASSWORD]: (change) => {
      handler(!!change.newValue)
    }
  }

  SESSION_STORE.watch(callbackMap)

  return () => {
    SESSION_STORE.unwatch(callbackMap)
  }
}

export function usePassword(): {
  exists: boolean | undefined
  isLocked: boolean | undefined
  isUnlocked: boolean | undefined
} {
  const [p1] = useLocalStorage(StoreKey.PASSWORD_HASH)
  const [p2] = useSessionStorage(StoreKey.PASSWORD)

  const { value: result } = useAsync(async () => {
    const exists = await PASSWORD.exists()
    const isLocked = await PASSWORD.isLocked()
    return {
      exists,
      isLocked,
      isUnlocked: !isLocked
    }
  }, [p1, p2])

  return (
    result || { exists: undefined, isLocked: undefined, isUnlocked: undefined }
  )
}

export function useCheckUnlocked() {
  const location = useLocation()
  const navigate = useNavigate()
  const { exists, isLocked, isUnlocked } = usePassword()

  const walletCount = useSubWalletsCount()

  useEffect(() => {
    if (isLocked || walletCount === 0) {
      navigate(`/unlock?redirect=${location.pathname}`, { replace: true })
    }
  }, [location, navigate, isLocked, walletCount])

  return { exists, isLocked, isUnlocked }
}
