import { AptosClient } from 'aptos'

import { AptosChainInfo } from '~lib/network/aptos'
import { ChainId, INetwork } from '~lib/schema'

const APTOS_CLIENTS = new Map<ChainId, AptosClient>()

export async function getAptosClient(network: INetwork) {
  let client = APTOS_CLIENTS.get(network.chainId)
  if (!client) {
    const info = network.info as AptosChainInfo
    client = new AptosClient(info.rpc[0])

    // check chain id
    if ((await client.getChainId()) !== network.chainId) {
      return
    }

    APTOS_CLIENTS.set(network.chainId, client)
  }
  return client
}
