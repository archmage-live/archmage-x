import { ProviderInterface, SequencerProvider } from 'starknet'
import { constants } from 'starknet'

import { StarknetChainInfo } from '~lib/network/starknet'
import { INetwork } from '~lib/schema'

export type StarknetClient = ProviderInterface

const STARKNET_CLIENTS = new Map<number, StarknetClient>()

export async function getStarknetClient(network: INetwork) {
  let client = STARKNET_CLIENTS.get(network.id)
  if (!client) {
    const info = network.info as StarknetChainInfo
    client = new SequencerProvider({
      baseUrl: info.baseUrl,
      chainId: info.chainId as constants.StarknetChainId
    })
    STARKNET_CLIENTS.set(network.id, client)
  }
  return client
}
