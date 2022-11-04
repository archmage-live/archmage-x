import {
  IStarknetProviderService,
  STARKNET_PROVIDER_NAME
} from '~lib/inject/starknet'
import { NetworkKind } from '~lib/network'
import { SERVICE_WORKER_SERVER } from '~lib/rpc'
import { BaseProviderService } from '~lib/services/provider/base'

class StarknetProviderService
  extends BaseProviderService
  implements IStarknetProviderService
{
  constructor() {
    super(NetworkKind.STARKNET)
  }
}

SERVICE_WORKER_SERVER.registerService(
  STARKNET_PROVIDER_NAME,
  new StarknetProviderService(),
  true
)
