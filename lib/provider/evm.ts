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
  return (
    global.archmage._service_client_proxy as RpcClientInjected
  ).service<IEvmProviderService>(EVM_PROVIDER_NAME)
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

  _metamask: {
    isUnlocked: () => false
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
