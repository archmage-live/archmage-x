import {
  IStarknetProviderService,
  STARKNET_PROVIDER_NAME
} from '~lib/inject/starknet'
import { NetworkKind } from '~lib/network'
import { StarknetChainInfo } from '~lib/network/starknet'
import { Context, SERVICE_WORKER_SERVER } from '~lib/rpc'
import { INetwork } from '~lib/schema'
import { BaseProviderService } from '~lib/services/provider/base'

import { StarknetPermissionedProvider } from './permissionedProvider'

class StarknetProviderService
  extends BaseProviderService
  implements IStarknetProviderService
{
  constructor() {
    super(NetworkKind.STARKNET)
  }

  async request(
    args: { method: string; params?: Array<any> },
    ctx: Context
  ): Promise<any> {
    const provider = await StarknetPermissionedProvider.fromMayThrow(
      ctx.fromUrl!
    )
    return provider.request(ctx, args.method, args.params || [])
  }

  protected override async switchNetwork(network?: INetwork) {
    // do nothing
  }

  protected override async emitNetworkChange(network?: INetwork) {
    const info = network?.info as StarknetChainInfo | undefined
    this.emit('networkChanged', {
      chainId: info ? info.shortName : undefined,
      baseUrl: info ? info.baseUrl : undefined
    })
  }

  protected override emitAccountsChange() {
    // here do not carry new accounts, since the injected script will fetch them
    this.emit('accountsChanged')
  }
}

SERVICE_WORKER_SERVER.registerService(
  STARKNET_PROVIDER_NAME,
  new StarknetProviderService(),
  true
)
