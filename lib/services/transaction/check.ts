import browser from 'webextension-polyfill'

import { DB } from '~lib/db'
import { NetworkKind } from '~lib/network'
import { IPendingTx, ITransaction } from '~lib/schema'
import { getTransactionService } from '~lib/services/transaction/index'

class PendingTxChecker {
  private waits: Map<number, Promise<ITransaction>> = new Map()
  private inCheck: boolean = false

  constructor() {
    browser.alarms.create('PendingTxChecker', {
      delayInMinutes: 1,
      periodInMinutes: 1
    })
    browser.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name !== 'PendingTxChecker') {
        return
      }
      if (this.inCheck) {
        return
      }
      this.inCheck = true

      const promises = []
      const networkKinds = Object.values(NetworkKind) as NetworkKind[]
      for (const networkKind of networkKinds) {
        promises.push(
          (async () => {
            try {
              await this.checkPendingTxs(networkKind)
            } catch (err) {
              console.error('checkPendingTxs:', err)
            }
          })()
        )
      }
      await Promise.all(promises)

      this.inCheck = false
    })
  }

  async checkPendingTxs(networkKind: NetworkKind) {
    while (true) {
      const pendingTx = await DB.pendingTxs
        .where('networkKind')
        .equals(networkKind)
        .first()
      if (!pendingTx) {
        return
      }

      console.log('Waiting for tx:', pendingTx)
      const tx = await this.checkPendingTx(pendingTx)
      if (!tx) {
        return
      }
    }
  }

  async checkPendingTx(
    pendingTx: IPendingTx,
    ...args: any[]
  ): Promise<ITransaction | undefined> {
    const wait = this.waits.get(pendingTx.id)
    if (wait) {
      return wait
    }

    let resolve: any = undefined
    this.waits.set(
      pendingTx.id,
      new Promise((r) => {
        resolve = r
      })
    )

    let transaction
    try {
      transaction = await getTransactionService(
        pendingTx.networkKind
      ).waitForTx(pendingTx, ...args)
    } catch (err) {
      console.error(err)
    }

    this.waits.delete(pendingTx.id)
    resolve(transaction)

    return transaction
  }
}

export const PENDING_TX_CHECKER = new PendingTxChecker()
