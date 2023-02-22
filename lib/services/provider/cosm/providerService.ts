import { Context } from '~lib/inject/client'
import { COSM_PROVIDER_NAME, ICosmProviderService } from '~lib/inject/cosm'
import { NetworkKind } from '~lib/network'
import { SERVICE_WORKER_SERVER } from '~lib/rpc'
import { INetwork } from '~lib/schema'
import { BaseProviderService } from '~lib/services/provider/base'

import { CosmClient, getCosmClient } from './client'
import { CosmPermissionedProvider } from './permissionedProvider'

class CosmProviderService
  extends BaseProviderService
  implements ICosmProviderService
{
  private client?: CosmClient

  constructor() {
    super(NetworkKind.COSM)
  }

  async request(
    args: { method: string; params?: Array<any> },
    ctx: Context
  ): Promise<any> {
    const provider = await CosmPermissionedProvider.fromMayThrow(ctx.fromUrl!)
    return provider.request(ctx, args.method, args.params || [])
  }

  protected override async switchNetwork(network?: INetwork) {
    this.client = network && (await getCosmClient(network))
  }

  protected override async emitNetworkChange(network?: INetwork) {}

  protected override emitAccountsChange() {
    this.emit('accountsChanged')
  }
}

SERVICE_WORKER_SERVER.registerService(
  COSM_PROVIDER_NAME,
  new CosmProviderService(),
  true
)