import { EVM_PROVIDER_NAME } from '~lib/provider/evm'
import { SERVICE_WORKER_SERVER } from '~lib/rpc'
import { INetwork, IWalletInfo } from '~lib/schema'
import { EvmProviderWithSigner } from '~lib/services/provider/evm'

export interface IEvmProviderService {
  request(method: string, params?: Array<any>, fromUrl?: string): Promise<any>
}

class EvmProviderService implements IEvmProviderService {
  async request(
    method: string,
    params?: Array<any>,
    fromUrl?: string
  ): Promise<any> {
    // TODO
    // check fromUrl
    // check method and params
    // get its connected network and wallet
    const network = {} as INetwork
    const wallet = {} as IWalletInfo
    const provider = new EvmProviderWithSigner(network, wallet)
    return provider.send(method, params ?? [])
  }
}

SERVICE_WORKER_SERVER.registerService(
  EVM_PROVIDER_NAME,
  new EvmProviderService(),
  true
)
