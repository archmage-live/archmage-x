import { ALEO_PROVIDER_NAME, IAleoProviderService } from '~lib/inject/aleo'
import { Context } from '~lib/inject/client'
import { NetworkKind } from '~lib/network'
import { AleoNetworkInfo } from '~lib/network/aleo'
import { SERVICE_WORKER_SERVER } from '~lib/rpc'
import { INetwork } from '~lib/schema'

import { BaseProviderService } from '../base'
import { AleoPermissionedProvider } from './permissionedProvider'

class AleoProviderService
  extends BaseProviderService
  implements IAleoProviderService
{
  constructor() {
    super(NetworkKind.ALEO)
  }

  async request(
    args: { method: string; params?: Array<any> },
    ctx: Context
  ): Promise<any> {
    const provider = await AleoPermissionedProvider.fromMayThrow(ctx.fromUrl!)
    return provider.request(ctx, args.method, args.params || [])
  }

  protected override async switchNetwork(network?: INetwork) {
    // do nothing
  }

  protected override async emitNetworkChange(network?: INetwork) {
    const info = network?.info as AleoNetworkInfo | undefined
    this.emit('networkChanged', {
      network: info?.networkId
    })
  }

  protected override emitAccountsChange() {
    // here do not carry new accounts, since the injected script will fetch them
    this.emit('accountsChanged')
  }
}

SERVICE_WORKER_SERVER.registerService(
  ALEO_PROVIDER_NAME,
  new AleoProviderService(),
  true
)
