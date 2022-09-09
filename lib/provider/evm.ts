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

global.ethereum = {
  ...global.archmage.evm,

  isMetaMask: true,

  connected: false,
  isConnected: () => global.ethereum.connected,

  _isUnlocked: false,
  _metamask: {
    isUnlocked: () => global.ethereum._isUnlocked
  },

  // deprecated
  chainId: '',
  networkVersion: '',
  selectedAddress: null,

  // deprecated
  enable: () => global.ethereum.request({ method: 'eth_requestAccounts' }),

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

async function init() {
  try {
    const info = await getService().info()

    global.ethereum.chainId = info.chainId
    global.ethereum.networkVersion = info.networkVersion
    global.ethereum.connected = info.connected
    global.ethereum.selectedAddress = info.activeAddress || null
    global.ethereum._isUnlocked = info.isUnlocked

    global.dispatchEvent(new CustomEvent('ethereum#initialized'))
  } catch (err) {
    console.error(err)
    setTimeout(init, 500)
  }
}

init()
