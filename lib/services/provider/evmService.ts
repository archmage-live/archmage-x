import { EVM_PROVIDER_NAME } from '~lib/provider/evm'
import { Context, SERVICE_WORKER_SERVER } from '~lib/rpc'
import { EvmPermissionedProvider } from '~lib/services/provider/evm/permissioned'

export interface IEvmProviderService {
  request(
    args: { method: string; params?: Array<any> },
    ctx?: Context
  ): Promise<any>
}

class EvmProviderService implements IEvmProviderService {
  async request(
    args: {
      method: string
      params?: Array<any>
    },
    ctx: Context
  ): Promise<any> {
    // TODO
    // check fromUrl
    // check method and params
    // get its connected network and wallet
    const provider = await EvmPermissionedProvider.from(ctx.fromUrl!)
    return provider.send(ctx, args.method, args.params ?? [])
  }
}

SERVICE_WORKER_SERVER.registerService(
  EVM_PROVIDER_NAME,
  new EvmProviderService(),
  true
)
