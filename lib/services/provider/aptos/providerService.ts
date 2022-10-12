import { AptosClient } from 'aptos'
import { ethErrors } from 'eth-rpc-errors'

import { Context } from '~lib/inject/client'
import { NetworkKind } from '~lib/network'
import { AptosPermissionedProvider } from '~lib/services/provider/aptos/permissionedProvider'
import { BaseProviderService } from '~lib/services/provider/base'
import { checkAddress } from '~lib/wallet'

class AptosProviderService extends BaseProviderService {
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

  private _checkAddress(address: string) {
    const addr = checkAddress(NetworkKind.APTOS, address)
    if (!addr) {
      throw ethErrors.rpc.invalidParams('invalid address')
    }
    return addr
  }
}
