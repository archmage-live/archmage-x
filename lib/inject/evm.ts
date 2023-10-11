import { isBackgroundWorker } from '~lib/detect'

import {
  ArchmageWindow,
  Context,
  EventEmitter,
  RpcClientInjected,
  context
} from './client'

export const EVM_PROVIDER_NAME = 'evmProvider'

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

if (
  !isBackgroundWorker() &&
  process.env.PLASMO_PUBLIC_ENABLE_EVM &&
  !globalThis.archmage.evm
) {
  const service =
    RpcClientInjected.instance().service<IEvmProviderService>(EVM_PROVIDER_NAME)

  globalThis.archmage.evm = {
    request(args: { method: string; params?: Array<any> }): Promise<any> {
      return service.request(args, context())
    }
  }

  const init = async () => {
    const listeners = new Map<string, Function[]>()

    globalThis.ethereum = {
      ...globalThis.archmage.evm,

      _state: {},

      isMetaMask: true,
      isArchmage: true,

      isConnected: () => globalThis.ethereum._state.isConnected,

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
        isUnlocked: () => globalThis.ethereum._state.isUnlocked
      },

      // deprecated
      chainId: '',
      networkVersion: '',
      selectedAddress: null,

      // deprecated
      enable: () =>
        globalThis.ethereum.request({ method: 'eth_requestAccounts' }),

      // deprecated
      sendAsync(
        request: { method: string; params?: Array<any> },
        callback: (error: any, response: any) => void
      ) {
        service
          .request(request, context())
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
          return service.request(
            {
              method: methodOrRequest,
              params: paramsOrCallback
            },
            context()
          )
        } else if (
          typeof methodOrRequest === 'object' &&
          paramsOrCallback &&
          !Array.isArray(paramsOrCallback)
        ) {
          service
            .request(methodOrRequest, context())
            .then((rep) => paramsOrCallback(undefined, rep))
            .catch((err) => paramsOrCallback(err, undefined))
        }
      }
    }

    service.on('unlocked', (isUnlocked) => {
      globalThis.ethereum._state.isUnlocked = isUnlocked
    })

    service.on('networkChanged', ({ chainId, networkVersion }) => {
      globalThis.ethereum.chainId = chainId
      globalThis.ethereum.networkVersion = networkVersion

      listeners.get('chainChanged')?.forEach((handler) => handler(chainId))
    })

    service.on('accountsChanged', async () => {
      const { chainId, networkVersion, ...state } = await service.state(
        context()
      )
      globalThis.ethereum._state = state
      globalThis.ethereum.selectedAddress = state.accounts.length
        ? state.accounts[0]
        : null

      listeners
        .get('accountsChanged')
        ?.forEach((handler) => handler(state.accounts.slice(0, 1)))
    })

    service.on('message', (...args: any[]) => {
      listeners.get('message')?.forEach((handler) => handler(...args))
    })

    service.state(context()).then(({ chainId, networkVersion, ...state }) => {
      const ethereum = globalThis.ethereum
      ethereum._state = state
      ethereum.chainId = chainId
      ethereum.networkVersion = networkVersion
      ethereum.selectedAddress = state.accounts.length
        ? state.accounts[0]
        : null
    })

    globalThis.dispatchEvent(new CustomEvent('ethereum#initialized'))
  }

  init().finally()
}

export interface EthereumWindow extends ArchmageWindow {
  ethereum: any
}

declare const globalThis: EthereumWindow
