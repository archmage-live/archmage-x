import { SuiClient } from '@mysten/sui/client'

import { SuiChainInfo } from '~archmage/network/sui'
import { ChainId, INetwork } from '~lib/schema'

export { SuiClient } from '@mysten/sui/client'

const SUI_CLIENTS = new Map<ChainId, SuiClient>()

export async function getSuiClient(network: INetwork) {
  let client = SUI_CLIENTS.get(network.id)
  if (!client) {
    const info = network.info as SuiChainInfo
    client = new SuiClient({ url: info.rpc[0] })
    SUI_CLIENTS.set(network.id, client)
  }
  return client
}
