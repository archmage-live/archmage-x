import { ISuiProviderService, SUI_PROVIDER_NAME } from '~lib/inject/sui'
import { NetworkKind } from '~lib/network'
import { SuiChainInfo } from '~lib/network/sui'
import { Context, SERVICE_WORKER_SERVER } from '~lib/rpc'
import { INetwork } from '~lib/schema'

import { BaseProviderService } from '../base'
import { SuiPermissionedProvider } from './permissionedProvider'

class SuiProviderService
  extends BaseProviderService
  implements ISuiProviderService
{
  constructor() {
    super(NetworkKind.SUI)
  }

  async request(
    args: { method: string; params?: Array<any> },
    ctx: Context
  ): Promise<any> {
    const provider = await SuiPermissionedProvider.fromMayThrow(ctx.fromUrl!)
    return provider.request(ctx, args.method, args.params || [])
  }

  protected override async switchNetwork(network?: INetwork) {
    // do nothing
  }

  protected override async emitNetworkChange(network?: INetwork) {
    const info = network?.info as SuiChainInfo | undefined
    this.emit('networkChanged', {
      network: info?.chainId
    })
  }

  protected override emitAccountsChange() {
    // here do not carry new accounts, since the injected script will fetch them
    this.emit('accountsChanged')
  }
}

SERVICE_WORKER_SERVER.registerService(
  SUI_PROVIDER_NAME,
  new SuiProviderService(),
  true
)
