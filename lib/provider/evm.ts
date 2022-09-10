import type { RpcClientInjected } from '~/lib/rpc/clientInjected'
import type { IEvmProviderService } from '~/lib/services/provider/evmService'

export const EVM_PROVIDER_NAME = 'evmProvider' as const

export interface IEvmProvider {
  request: (args: { method: string; params?: Array<any> }) => Promise<any>
}

const global = globalThis as any
if (!global.archmage) {
  global.archmage = {}
}

function getService() {
  if (!global.archmage.clientProxy && global.archmage.RpcClientInjected) {
    global.archmage.clientProxy = new global.archmage.RpcClientInjected()
    global.archmage.evmService = (
      global.archmage.clientProxy as RpcClientInjected
    ).service<IEvmProviderService>(EVM_PROVIDER_NAME)
  }
  return global.archmage.evmService as IEvmProviderService
}

global.archmage.evm = {
  request(args: { method: string; params?: Array<any> }): Promise<any> {
    return getService().request(args)
  }
} as IEvmProvider

async function init() {
  if (global.ethereum) {
    return
  }

  const listeners = new Map<string, Function[]>()

  getService().on('unlocked', (isUnlocked) => {
    global.ethereum._state.isUnlocked = isUnlocked
  })

  getService().on('networkChanged', ({ chainId, networkVersion }) => {
    global.ethereum.chainId = chainId
    global.ethereum.networkVersion = networkVersion

    listeners.get('chainChanged')?.forEach((handler) => handler(chainId))
  })

  getService().on('accountsChanged', async () => {
    const { chainId, networkVersion, ...state } = await getService().state()
    global.ethereum._state = state
    global.ethereum.selectedAddress = state.accounts.length
      ? state.accounts[0]
      : null

    listeners
      .get('accountsChanged')
      ?.forEach((handler) => handler(state.accounts.slice(0, 1)))
  })

  const { chainId, networkVersion, ...state } = await getService().state()
  const selectedAddress = state.accounts.length ? state.accounts[0] : null

  const ethereum = {
    ...global.archmage.evm,

    _state: state,

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
    chainId,
    networkVersion,
    selectedAddress,

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
      request: { method: string; params?: Array<any> },
      callback: (error: any, response: any) => void
    ) {
      getService()
        .request(request)
        .then((rep) => callback(undefined, rep))
        .catch((err) => callback(err, undefined))
    }
  }

  global.ethereum = ethereum

  global.dispatchEvent(new CustomEvent('ethereum#initialized'))
}

init()
