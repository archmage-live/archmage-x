import { ENV } from '~lib/env'
import type { RpcClientInjected } from '~lib/inject/client'
import { Context, EventEmitter } from '~lib/inject/client'

export const EVM_PROVIDER_NAME = 'evmProvider' as const

export interface IEvmProviderService extends EventEmitter {
  state(ctx?: Context): Promise<{
    isUnlocked: boolean
    chainId?: string
    networkVersion?: string
    isConnected: boolean
    accounts: string[]
  }>

  request(
    args: { method: string; params?: Array<any> },
    ctx?: Context
  ): Promise<any>
}

declare global {
  var archmage: any
  var ethereum: any
}

if (!globalThis.archmage) {
  globalThis.archmage = {}
}

if (!ENV.inServiceWorker && !globalThis.archmage.evm) {
  const getService = () => {
    if (
      !globalThis.archmage.clientProxy &&
      globalThis.archmage.RpcClientInjected
    ) {
      globalThis.archmage.clientProxy =
        new globalThis.archmage.RpcClientInjected()
      globalThis.archmage.evmService = (
        globalThis.archmage.clientProxy as RpcClientInjected
      ).service<IEvmProviderService>(EVM_PROVIDER_NAME)
    }
    return globalThis.archmage.evmService as IEvmProviderService
  }

  globalThis.archmage.evm = {
    request(args: { method: string; params?: Array<any> }): Promise<any> {
      return getService().request(args)
    }
  }

  const init = async () => {
    const listeners = new Map<string, Function[]>()

    getService().on('unlocked', (isUnlocked) => {
      globalThis.ethereum._state.isUnlocked = isUnlocked
    })

    getService().on('networkChanged', ({ chainId, networkVersion }) => {
      globalThis.ethereum.chainId = chainId
      globalThis.ethereum.networkVersion = networkVersion

      listeners.get('chainChanged')?.forEach((handler) => handler(chainId))
    })

    getService().on('accountsChanged', async () => {
      const { chainId, networkVersion, ...state } = await getService().state()
      globalThis.ethereum._state = state
      globalThis.ethereum.selectedAddress = state.accounts.length
        ? state.accounts[0]
        : null

      listeners
        .get('accountsChanged')
        ?.forEach((handler) => handler(state.accounts.slice(0, 1)))
    })

    getService().on('message', (...args: any[]) => {
      listeners.get('message')?.forEach((handler) => handler(...args))
    })

    getService()
      .state()
      .then(({ chainId, networkVersion, ...state }) => {
        const ethereum = globalThis.ethereum
        ethereum._state = state
        ethereum.chainId = chainId
        ethereum.networkVersion = networkVersion
        ethereum.selectedAddress = state.accounts.length
          ? state.accounts[0]
          : null
      })

    const ethereum = {
      ...globalThis.archmage.evm,

      _state: {},

      isMetaMask: true,
      isArchmage: true,

      isConnected: () => ethereum._state.isConnected,

      on: (event: string, handler: (...args: any[]) => void) => {
        let handlers = listeners.get(event)
        if (!handlers) {
          handlers = []
          listeners.set(event, handlers)
        }
        switch (event) {
          case 'connect':
          case 'disconnect':
          case 'chainChanged':
          case 'accountsChanged':
          case 'message':
            handlers.push(handler)
            break
        }
      },

      removeListener: (event: string, handler: (...args: any[]) => void) => {
        const handlers = listeners.get(event)
        if (!handlers?.length) {
          return
        }
        const index = handlers.findIndex((h) => h === handler)
        if (index > -1) {
          handlers.splice(index, 1)
        }
      },

      _metamask: {
        isUnlocked: () => ethereum._state.isUnlocked
      },

      // deprecated
      chainId: '',
      networkVersion: '',
      selectedAddress: null,

      // deprecated
      enable: () => ethereum.request({ method: 'eth_requestAccounts' }),

      // deprecated
      sendAsync(
        request: { method: string; params?: Array<any> },
        callback: (error: any, response: any) => void
      ) {
        getService()
          .request(request)
          .then((rep) => callback(undefined, rep))
          .catch((err) => callback(err, undefined))
      },

      // deprecated
      send(
        methodOrRequest: string | { method: string; params?: Array<any> },
        paramsOrCallback?:
          | Array<unknown>
          | ((error: any, response: any) => void)
      ) {
        if (
          typeof methodOrRequest === 'string' &&
          (paramsOrCallback === undefined || Array.isArray(paramsOrCallback))
        ) {
          return getService().request({
            method: methodOrRequest,
            params: paramsOrCallback
          })
        } else if (
          typeof methodOrRequest === 'object' &&
          paramsOrCallback &&
          !Array.isArray(paramsOrCallback)
        ) {
          getService()
            .request(methodOrRequest)
            .then((rep) => paramsOrCallback(undefined, rep))
            .catch((err) => paramsOrCallback(err, undefined))
        }
      }
    }

    globalThis.ethereum = ethereum

    globalThis.dispatchEvent(new CustomEvent('ethereum#initialized'))
  }

  init()
}
