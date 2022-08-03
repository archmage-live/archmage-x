import { EVM_PROVIDER_NAME } from '~lib/provider/evm'
import { SERVICE_WORKER_SERVER } from '~lib/rpc'

export interface IEvmProviderService {
  request(method: string, params?: Array<any>, fromUrl?: string): Promise<any>
}

class EvmProviderService implements IEvmProviderService {
  async request(
    method: string,
    params?: Array<any>,
    fromUrl?: string
  ): Promise<any> {
    return `${method},${params},${fromUrl}`
  }
}

SERVICE_WORKER_SERVER.registerService(
  EVM_PROVIDER_NAME,
  new EvmProviderService(),
  true
)
