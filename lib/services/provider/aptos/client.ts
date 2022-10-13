import axiosFetchAdaptor from '@vespaiach/axios-fetch-adapter'
import { AptosClient } from 'aptos'
import Axios from 'axios'

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
    console.log('getChainId 1')
    if ((await client.getChainId()) !== network.chainId) {
      return
    }
    console.log('getChainId 2')

    APTOS_CLIENTS.set(network.chainId, client)
  }
  return client
}
