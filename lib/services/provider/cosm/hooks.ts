import { StdSignDoc } from '@cosmjs/amino'
import { SignDoc } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { useAsyncRetry } from 'react-use'

import { IChainAccount, INetwork } from '~lib/schema'
import { getCosmClient } from '~lib/services/provider/cosm/client'

export function useCosmTransaction(
  network?: INetwork,
  account?: IChainAccount,
  signDoc?: SignDoc | StdSignDoc
) {
  const { value, loading, retry } = useAsyncRetry(async () => {
    if (!network || !account) {
      return
    }
    const client = await getCosmClient(network)
    if (!client) {
      return
    }
    // client.getQueryClient().tx.simulate()
  })
}
