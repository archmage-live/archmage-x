import axiosFetchAdaptor from '@vespaiach/axios-fetch-adapter'
import { AptosClient } from 'aptos'
import Axios from 'axios'

import { DB } from '~lib/db'
import { AptosChainInfo } from '~lib/network/aptos'
import { ChainId, INetwork } from '~lib/schema'

Axios.defaults.adapter = axiosFetchAdaptor

const APTOS_CLIENTS = new Map<ChainId, AptosClient>()

export async function getAptosClient(network: INetwork) {
  let client = APTOS_CLIENTS.get(network.chainId)
  if (!client) {
    const info = network.info as AptosChainInfo
    client = new AptosClient(info.rpc[0])

    // check chain id
    const chainId = await client.getChainId()
    if (chainId !== network.chainId) {
      if (network.chainId === 0) {
        // since devnet often changes its chain ID
        const info = network.info as AptosChainInfo
        info.chainId = chainId
        await DB.networks.update(network, { chainId, info })
      } else {
        return undefined
      }
    }

    APTOS_CLIENTS.set(network.chainId, client)
  }
  return client
}
