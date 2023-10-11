import { isBackgroundWorker } from '~lib/detect'

import {
  ArchmageWindow,
  Context,
  EventEmitter,
  Listener,
  RpcClientInjected,
  context,
  isMsgEventMethod
} from './client'

export const APTOS_PROVIDER_NAME = 'aptosProvider'

export interface IAptosProviderService extends EventEmitter {
  request(
    args: { method: string; params?: Array<any> },
    ctx?: Context
  ): Promise<any>
}

if (
  !isBackgroundWorker() &&
  process.env.PLASMO_PUBLIC_ENABLE_APTOS &&
  !globalThis.archmage.aptos
) {
  const service =
    RpcClientInjected.instance().service<IAptosProviderService>(
      APTOS_PROVIDER_NAME
    )

  const onNetworkChange = (listener: Listener) => {
    service.on('networkChanged', listener)
  }

  const onAccountChange = (listener: Listener) => {
    service.on('accountsChanged', async () => {
      try {
        const account = await service.request({ method: 'account' }, context())
        listener(account)
      } catch {
        listener(undefined)
      }
    })
  }

  const onDisconnect = (listener: Listener) => {
    service.on('accountsChanged', async () => {
      try {
        await service.request({ method: 'account' }, context())
      } catch {
        listener()
      }
    })
  }

  const aptos = new Proxy(service, {
    get: (service, method: string) => {
      switch (method) {
        case 'onNetworkChange':
          return onNetworkChange
        case 'onAccountChange':
          return onAccountChange
        case 'onDisconnect':
          return onDisconnect
      }

      if (isMsgEventMethod(method)) {
        return service[method]
      }

      return (...params: any[]) => {
        return service.request({ method, params }, context())
      }
    }
  })

  globalThis.aptos = aptos
  globalThis.archmage.aptos = aptos
}

export interface AptosWindow extends ArchmageWindow {
  aptos: any
}

declare const globalThis: AptosWindow
