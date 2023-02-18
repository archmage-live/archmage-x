import { QueryClient } from '@cosmjs/stargate'
import { createRpcQueryExtension } from 'osmojs/types/codegen/cosmos/gov/v1/query.rpc.Query'

import { CosmClient } from '~lib/services/provider/cosm/client'

export function getOsmosisQueryClient(client: CosmClient) {
  const c = new QueryClient(client.getTmClient())
  return {
    osmosis: {
      txfees: {
        v1beta1: createRpcQueryExtension(c)
      }
    }
  }
}
