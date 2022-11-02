import assert from 'assert'

import { NetworkKind } from '~lib/network'
import { INetwork } from '~lib/schema'
import { BasePermissionedProvider } from '~lib/services/provider/base'
import { SuiClient } from '~lib/services/provider/sui/client'

export class SuiPermissionedProvider extends BasePermissionedProvider {
  private constructor(
    network: INetwork,
    public client: SuiClient,
    origin: string
  ) {
    super(network, origin)
    assert(network.kind === NetworkKind.SUI)
  }
}
