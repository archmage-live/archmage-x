import { EVM_PROVIDER_NAME } from '~lib/provider/evm'
import { SERVICE_WORKER_SERVER } from '~lib/rpc'
import { INetwork, IWalletInfo } from '~lib/schema'
import { EvmClientProvider } from '~lib/services/provider/evm/transaction'

export interface IEvmProviderService {
  request(
    args: { method: string; params?: Array<any> },
    fromUrl?: string
  ): Promise<any>
}

class EvmProviderService implements IEvmProviderService {
  async request(
    args: {
      method: string
      params?: Array<any>
    },
    fromUrl: string
  ): Promise<any> {
    // TODO
    // check fromUrl
    // check method and params
    // get its connected network and wallet
    const provider = await EvmClientProvider.from(fromUrl)
    return provider.send(args.method, args.params ?? [])
  }
}

SERVICE_WORKER_SERVER.registerService(
  EVM_PROVIDER_NAME,
  new EvmProviderService(),
  true
)
