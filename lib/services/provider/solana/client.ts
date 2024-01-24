import { Connection } from '@solana/web3.js'

import { SolanaChainInfo } from '~lib/network/solana'
import { ChainId, INetwork } from '~lib/schema'

export type SolanaClient = Connection

const SOLANA_CLIENTS = new Map<ChainId, SolanaClient>()

export function getSolanaClient(network: INetwork): SolanaClient {
  let client = SOLANA_CLIENTS.get(network.id)
  if (!client) {
    const info = network.info as SolanaChainInfo
    client = new Connection(info.rpc[0], {
      commitment: 'confirmed'
    })
    SOLANA_CLIENTS.set(network.id, client)
  }
  return client
}
