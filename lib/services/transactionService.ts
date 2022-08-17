import assert from 'assert'
import browser from 'webextension-polyfill'

import { ENV } from '~lib/env'
import { SERVICE_WORKER_CLIENT, SERVICE_WORKER_SERVER } from '~lib/rpc'
import { NETWORK_SERVICE } from '~lib/services/network'
import { getProvider } from '~lib/services/provider'
import { WALLET_SERVICE } from '~lib/services/walletService'
import { SESSION_STORE, StoreKey, useSessionStorage } from '~lib/store'

export type TransactionRequest = {
  id: number
  networkId: number
  walletInfoId: number
  payload: any
}

interface ITransactionService {
  requestTransaction(req: TransactionRequest): Promise<any>

  processTransaction(req: TransactionRequest, approve: boolean): Promise<void>

  clearTransactions(): Promise<void>
}

class TransactionService implements ITransactionService {
  txRequests: TransactionRequest[] = []
  waits = new Map<number, [Function, Function]>()
  nextId = 0

  constructor() {
    if (ENV.inServiceWorker) {
      SESSION_STORE.get<TransactionRequest[]>(StoreKey.TX_REQUESTS).then(
        (txRequests) => {
          if (!txRequests) {
            return
          }
          this.txRequests = txRequests
          this.nextId =
            txRequests
              .map((req) => req.id)
              .reduce((maxId, id) => Math.max(maxId, id)) + 1
        }
      )
    }
  }

  async clearTransactions() {
    this.txRequests = []
    this.waits.clear()
    await SESSION_STORE.remove(StoreKey.TX_REQUESTS)
  }

  async requestTransaction(req: TransactionRequest): Promise<any> {
    req.id = this.nextId++
    this.txRequests.push(req)

    // cache
    await SESSION_STORE.set(StoreKey.TX_REQUESTS, this.txRequests)

    let resolve, reject
    const promise = new Promise((res, rej) => {
      resolve = res
      reject = rej
    })
    this.waits.set(req.id, [resolve as any, reject as any])

    // open popup
    await browser.action.openPopup()

    return await promise
  }

  async processTransaction(req: TransactionRequest, approve: boolean) {
    let index = this.txRequests.findIndex(({ id }) => req.id === id)
    if (index < 0) {
      throw new Error(`transaction request with id ${req.id} not found`)
    }

    // delete cache
    this.txRequests.splice(index, 1)
    await SESSION_STORE.set(StoreKey.TX_REQUESTS, this.txRequests)

    let resolve, reject
    const wait = this.waits.get(req.id)
    if (wait) {
      ;[resolve, reject] = wait
      this.waits.delete(req.id)
    }

    if (approve) {
      try {
        const network = await NETWORK_SERVICE.getNetwork(req.networkId)
        assert(network)
        const provider = getProvider(network)
        const wallet = await WALLET_SERVICE.getWalletInfo(req.walletInfoId)
        assert(wallet)
        const response = await provider.signTransaction(wallet, req.payload)
        resolve?.(response)
      } catch (err: any) {
        reject?.(err && err.toString?.())
      }
    } else {
      reject?.('User rejected transaction')
    }
  }
}

function createTransactionService() {
  const serviceName = 'transactionService'
  if (ENV.inServiceWorker) {
    const service = new TransactionService()
    SERVICE_WORKER_SERVER.registerService(serviceName, service)
    return service
  } else {
    return SERVICE_WORKER_CLIENT.service<ITransactionService>(serviceName)
  }
}

export const TRANSACTION_SERVICE = createTransactionService()

export function useTransactionRequests(): TransactionRequest[] | undefined {
  const [requests] = useSessionStorage(StoreKey.TX_REQUESTS)
  return requests
}
