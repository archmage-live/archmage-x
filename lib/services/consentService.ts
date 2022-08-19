import assert from 'assert'
import { ethErrors } from 'eth-rpc-errors'
import browser from 'webextension-polyfill'

import { ENV } from '~lib/env'
import { SERVICE_WORKER_CLIENT, SERVICE_WORKER_SERVER } from '~lib/rpc'
import { NETWORK_SERVICE } from '~lib/services/network'
import { getProvider } from '~lib/services/provider'
import { WALLET_SERVICE } from '~lib/services/walletService'
import { SESSION_STORE, StoreKey, useSessionStorage } from '~lib/store'

export enum ConsentType {
  TRANSACTION = 'transaction',
  SIGN_MSG = 'signMessage',
  SIGN_TYPED_DATA = 'signTypedData'
}

export type ConsentRequest = {
  id: number
  networkId: number
  walletInfoId: number
  type: ConsentType
  payload: any
}

interface IConsentService {
  requestConsent(req: ConsentRequest): Promise<any>

  clearRequests(type?: ConsentType): Promise<void>

  processRequest(req: ConsentRequest, approve: boolean): Promise<void>
}

class ConsentService implements IConsentService {
  private consentRequests: ConsentRequest[] = []
  private waits = new Map<number, [Function, Function]>()
  private nextId = 0
  private readonly init: Promise<void>

  constructor() {
    this.init = SESSION_STORE.get<ConsentRequest[]>(
      StoreKey.CONSENT_REQUESTS
    ).then((consentRequests) => {
      if (!consentRequests?.length) {
        return
      }
      this.consentRequests = consentRequests
      const lastId = consentRequests
        .map((req) => req.id)
        .reduce((maxId, id) => Math.max(maxId, id))
      this.nextId = lastId + 1
    })
  }

  async clearRequests(type?: ConsentType) {
    await this.init

    const removed =
      type === undefined
        ? this.consentRequests
        : this.consentRequests.filter((req) => req.type === type)
    const removedSet = new Set(removed.map((req) => req.id))

    this.consentRequests = this.consentRequests.filter(
      (req) => !removedSet.has(req.id)
    )
    for (const [id, [_, reject]] of this.waits) {
      if (removedSet.has(id)) {
        reject(ethErrors.provider.userRejectedRequest())
        this.waits.delete(id)
      }
    }
    await SESSION_STORE.set(StoreKey.CONSENT_REQUESTS, this.consentRequests)
  }

  // be called by content script
  async requestConsent(request: Omit<ConsentRequest, 'id'>): Promise<any> {
    await this.init

    const req = {
      ...request,
      id: this.nextId++
    }
    this.consentRequests.push(req)

    // cache
    await SESSION_STORE.set(StoreKey.CONSENT_REQUESTS, this.consentRequests)

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

  // be called by popup
  async processRequest(req: ConsentRequest, approve: boolean) {
    await this.init

    let index = this.consentRequests.findIndex(({ id }) => req.id === id)
    if (index < 0) {
      throw new Error(`transaction request with id ${req.id} not found`)
    }

    // delete cache
    this.consentRequests.splice(index, 1)
    await SESSION_STORE.set(StoreKey.CONSENT_REQUESTS, this.consentRequests)

    let resolve, reject
    const wait = this.waits.get(req.id)
    if (wait) {
      ;[resolve, reject] = wait
      this.waits.delete(req.id)
    }

    if (!approve) {
      reject?.(ethErrors.provider.userRejectedRequest())
      return
    }

    try {
      const network = await NETWORK_SERVICE.getNetwork(req.networkId)
      assert(network)
      const provider = getProvider(network)
      const wallet = await WALLET_SERVICE.getWalletInfo(req.walletInfoId)
      assert(wallet)

      let response
      switch (req.type) {
        case ConsentType.TRANSACTION:
          response = await provider.signTransaction(wallet, req.payload)
          break
        case ConsentType.SIGN_MSG:
          response = await provider.signMessage(wallet, req.payload)
          break
        case ConsentType.SIGN_TYPED_DATA:
          response = await provider.signTypedData(wallet, req.payload)
          break
      }

      resolve?.(response)
    } catch (err) {
      reject?.(err)
    }
  }
}

function createConsentService() {
  const serviceName = 'consentService'
  if (ENV.inServiceWorker) {
    const service = new ConsentService()
    SERVICE_WORKER_SERVER.registerService(serviceName, service)
    return service
  } else {
    return SERVICE_WORKER_CLIENT.service<IConsentService>(serviceName)
  }
}

export const CONSENT_SERVICE = createConsentService()

export function useConsentRequests(): ConsentRequest[] | undefined {
  const [requests] = useSessionStorage(StoreKey.CONSENT_REQUESTS)
  return requests
}
