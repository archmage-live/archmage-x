import { Context } from '~lib/inject/client'
import {
  ISolanaProviderService,
  SOLANA_PROVIDER_NAME
} from '~lib/inject/solana'
import { NetworkKind } from '~lib/network'
import { SolanaChainInfo } from '~lib/network/solana'
import { SERVICE_WORKER_SERVER } from '~lib/rpc'
import { INetwork } from '~lib/schema'
import { BaseProviderService } from '~lib/services/provider/base'

import { SolanaPermissionedProvider } from './permissionedProvider'

class SolanaProviderService
  extends BaseProviderService
  implements ISolanaProviderService
{
  constructor() {
    super(NetworkKind.SOLANA)
  }

  async request(
    args: { method: string; params?: Array<any> },
    ctx: Context
  ): Promise<any> {
    const provider = await SolanaPermissionedProvider.fromMayThrow(ctx.fromUrl!)
    return provider.request(ctx, args.method, args.params || [])
  }

  protected override async switchNetwork(network?: INetwork) {
    // do nothing
  }

  protected override async emitNetworkChange(network?: INetwork) {
    const info = network?.info as SolanaChainInfo | undefined
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
  SOLANA_PROVIDER_NAME,
  new SolanaProviderService(),
  true
)
