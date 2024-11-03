import { QueryClient } from '@cosmjs/stargate'
import { osmosis } from 'osmojs'

import { CosmClient } from '~lib/services/provider/cosm/client'

export function getOsmosisQueryClient(client: CosmClient) {
  const c = new QueryClient(client.getTmClient())
  return {
    osmosis: {
      txfees: {
        v1beta1: osmosis.txfees.v1beta1.createRpcQueryExtension(c)
      }
    }
  }
}
