import assert from 'assert'
import { ethErrors } from 'eth-rpc-errors'
import browser from 'webextension-polyfill'

import { ENV } from '~lib/env'
import { Context, SERVICE_WORKER_CLIENT, SERVICE_WORKER_SERVER } from '~lib/rpc'
import { IWalletInfo } from '~lib/schema'
import { CONNECTED_SITE_SERVICE } from '~lib/services/connectedSiteService'
import { NETWORK_SERVICE } from '~lib/services/network'
import { getProvider } from '~lib/services/provider'
import { WALLET_SERVICE } from '~lib/services/walletService'
import { SESSION_STORE, StoreKey, useSessionStorage } from '~lib/store'
import { createWindow } from '~lib/util'

export enum Permission {
  ACCOUNT = 'account'
}

export type RequestPermissionPayload = {
  permissions: { permission: Permission; data?: any }[]
}

export enum ConsentType {
  REQUEST_PERMISSION = 'requestPermission',
  TRANSACTION = 'transaction',
  SIGN_MSG = 'signMessage',
  SIGN_TYPED_DATA = 'signTypedData',
  WATCH_ASSET = 'watchAsset'
}

export type ConsentRequest = {
  id: number
  networkId: number
  walletInfoId: number | number[]
  type: ConsentType
  origin: string
  payload: any
}

interface IConsentService {
  requestConsent(ctx: Context, req: Omit<ConsentRequest, 'id'>): Promise<any>

  getRequests(): Promise<ConsentRequest[]>

  clearRequests(type?: ConsentType): Promise<void>

  processRequest(req: ConsentRequest, approve: boolean): Promise<void>
}

class ConsentService implements IConsentService {
  private consentRequests: ConsentRequest[] = []
  private waits = new Map<number, [Function, Function]>()
  private nextId = 0
  private readonly initPromise: Promise<void>

  constructor() {
    this.initPromise = SESSION_STORE.get<ConsentRequest[]>(
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

      this.setBadge()
    })
  }

  async getRequests(): Promise<ConsentRequest[]> {
    await this.initPromise
    return this.consentRequests
  }

  async clearRequests(type?: ConsentType) {
    await this.initPromise

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

    await this.setBadge()
  }

  // be called by content script
  async requestConsent(
    ctx: Context,
    request: Omit<ConsentRequest, 'id'>
  ): Promise<any> {
    await this.initPromise

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

    await this.setBadge()

    // open popup
    await createWindow(ctx, '/')

    return await promise
  }

  // be called by popup
  async processRequest(req: ConsentRequest, approve: boolean) {
    await this.initPromise

    let index = this.consentRequests.findIndex(({ id }) => req.id === id)
    if (index < 0) {
      throw new Error(`transaction request with id ${req.id} not found`)
    }

    // delete cache
    this.consentRequests.splice(index, 1)
    await SESSION_STORE.set(StoreKey.CONSENT_REQUESTS, this.consentRequests)

    await this.setBadge()

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
      const wallets = await WALLET_SERVICE.getWalletsInfo(
        Array.isArray(req.walletInfoId) ? req.walletInfoId : [req.walletInfoId]
      )
      assert(wallets)

      let response
      switch (req.type) {
        case ConsentType.REQUEST_PERMISSION:
          response = await this.requestPermission(
            wallets,
            req.origin,
            req.payload
          )
          break
        case ConsentType.TRANSACTION:
          response = await provider.signTransaction(wallets[0], req.payload)
          break
        case ConsentType.SIGN_MSG:
          response = await provider.signMessage(wallets[0], req.payload)
          break
        case ConsentType.SIGN_TYPED_DATA:
          response = await provider.signTypedData(wallets[0], req.payload)
          break
        case ConsentType.WATCH_ASSET:
          // TODO
          break
      }

      resolve?.(response)
    } catch (err) {
      reject?.(err)
    }
  }

  private async requestPermission(
    wallets: IWalletInfo[],
    origin: string,
    payload: RequestPermissionPayload
  ): Promise<any> {
    for (const { permission } of payload.permissions) {
      switch (permission) {
        case Permission.ACCOUNT:
          await CONNECTED_SITE_SERVICE.connectSite(wallets, origin)
      }
    }
  }

  private async setBadge() {
    if (!this.consentRequests.length) {
      await browser.action.setBadgeText({ text: '' })
    } else {
      await browser.action.setBadgeText({
        text: this.consentRequests.length + ''
      })
      await browser.action.setBadgeBackgroundColor({ color: '#037DD6' })
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
