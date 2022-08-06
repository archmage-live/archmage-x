import browser from 'webextension-polyfill'

import { useStorage } from '@plasmohq/storage'

import { LOCAL_STORE, StoreArea, StoreKey } from '~lib/store'

export function useLockTime() {
  return useStorage(
    {
      key: StoreKey.AUTO_LOCK_TIME,
      area: StoreArea.LOCAL
    },
    0
  )
}

export function checkLockTime(lock: () => Promise<void>) {
  // check loop
  browser.alarms.create('checkLockTime', {
    delayInMinutes: 1,
    periodInMinutes: 1
  })
  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== 'checkLockTime') {
      return
    }
    const lockTime =
      (await LOCAL_STORE.get<number>(StoreKey.AUTO_LOCK_TIME)) || 0
    const lastUnlockAt =
      (await LOCAL_STORE.get<number>(StoreKey.LAST_UNLOCK_TIME)) || Date.now()

    if (lockTime > 0 && lockTime * 60 * 1000 <= Date.now() - lastUnlockAt) {
      await lock()
    }
  })
}

export async function setUnlockTime() {
  await LOCAL_STORE.set(StoreKey.LAST_UNLOCK_TIME, Date.now())
}
