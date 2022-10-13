import { AptosClient } from 'aptos'
import { ethErrors } from 'eth-rpc-errors'

import { APTOS_PROVIDER_NAME, IAptosProviderService } from '~lib/inject/aptos'
import { Context } from '~lib/inject/client'
import { NetworkKind } from '~lib/network'
import { SERVICE_WORKER_SERVER } from '~lib/rpc'
import { INetwork } from '~lib/schema'
import { getNetworkInfo } from '~lib/services/network'
import { getAptosClient } from '~lib/services/provider/aptos/client'
import { AptosPermissionedProvider } from '~lib/services/provider/aptos/permissionedProvider'
import { BaseProviderService } from '~lib/services/provider/base'
import { checkAddress } from '~lib/wallet'

class AptosProviderService
  extends BaseProviderService
  implements IAptosProviderService
{
  private client?: AptosClient

  constructor() {
    super(NetworkKind.APTOS)
  }

  async request(
    args: {
      method: string
      params?: Array<any>
    },
    ctx: Context
  ) {
    const provider = await AptosPermissionedProvider.fromMayThrow(ctx.fromUrl!)
    return provider.request(ctx, args.method, args.params || [])
  }

  protected override async switchNetwork(network?: INetwork) {
    this.client = network && (await getAptosClient(network))
  }

  protected override async emitNetworkChange(network?: INetwork) {
    const info = network && getNetworkInfo(network)
    this.emit('networkChanged', info?.name)
  }

  protected override emitAccountsChange() {
    this.emit('accountsChanged')
  }

  private _checkAddress(address: string) {
    const addr = checkAddress(NetworkKind.APTOS, address)
    if (!addr) {
      throw ethErrors.rpc.invalidParams('invalid address')
    }
    return addr
  }
}

SERVICE_WORKER_SERVER.registerService(
  APTOS_PROVIDER_NAME,
  new AptosProviderService(),
  true
)
