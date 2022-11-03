import { ProviderInterface, SequencerProvider } from 'starknet'
import { StarknetChainId } from 'starknet/constants'

import { StarknetChainInfo } from '~lib/network/starknet'
import { ChainId, INetwork } from '~lib/schema'

export type StarknetClient = ProviderInterface

const STARKNET_CLIENTS = new Map<number, StarknetClient>()

export async function getStarknetClient(network: INetwork) {
  let client = STARKNET_CLIENTS.get(network.id)
  if (!client) {
    const info = network.info as StarknetChainInfo
    client = new SequencerProvider({
      baseUrl: info.rpc[0],
      chainId: info.chainId as StarknetChainId
    })
    STARKNET_CLIENTS.set(network.id, client)
  }
  return client
}
