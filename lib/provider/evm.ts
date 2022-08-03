import type { RpcClientInjected } from '~/lib/rpc/clientInjected'
import type { IEvmProviderService } from '~/lib/services/provider/evmService'

export const EVM_PROVIDER_NAME = 'evmProvider' as const

export interface IEvmProvider {
  sendAsync: (
    request: { method: string; params?: Array<any> },
    callback: (error: any, response: any) => void
  ) => void

  send: (
    request: { method: string; params?: Array<any> },
    callback: (error: any, response: any) => void
  ) => void

  request: (request: { method: string; params?: Array<any> }) => Promise<any>
}

const global = globalThis as any
if (!global.archmage) {
  global.archmage = {}
}

let service: IEvmProviderService

function getService() {
  if (!service) {
    service = (
      global.archmage._service_client as RpcClientInjected
    ).service<IEvmProviderService>(EVM_PROVIDER_NAME)
  }
  return service
}

global.archmage.evm = {
  sendAsync(
    request: { method: string; params?: Array<any> },
    callback: (error: any, response: any) => void
  ) {
    getService()
      .request(request.method, request.params)
      .then((rep) => callback(undefined, rep))
      .catch((err) => callback(err, undefined))
  },

  send(
    request: { method: string; params?: Array<any> },
    callback: (error: any, response: any) => void
  ) {
    getService()
      .request(request.method, request.params)
      .then((rep) => callback(undefined, rep))
      .catch((err) => callback(err, undefined))
  },

  request(request: { method: string; params?: Array<any> }): Promise<any> {
    return getService().request(request.method, request.params)
  }
} as IEvmProvider
