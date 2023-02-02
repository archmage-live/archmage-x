import { JsonRpcProvider } from '@mysten/sui.js'

import { SuiChainInfo } from '~lib/network/sui'
import { ChainId, INetwork } from '~lib/schema'

export type SuiClient = JsonRpcProvider

const SUI_CLIENTS = new Map<ChainId, SuiClient>()

export async function getSuiClient(network: INetwork) {
  let client = SUI_CLIENTS.get(network.id)
  if (!client) {
    const info = network.info as SuiChainInfo
    client = new JsonRpcProvider(info.rpc[0], {
      skipDataValidation: false,
      versionCacheTimoutInSeconds: 600
    })
    SUI_CLIENTS.set(network.id, client)
  }
  return client
}
