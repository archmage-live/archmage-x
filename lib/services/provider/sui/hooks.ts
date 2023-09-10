import { DryRunTransactionBlockResponse } from '@mysten/sui.js/client'
import { TransactionBlock } from '@mysten/sui.js/transactions'
import { useEffect, useState } from 'react'
import { useAsyncRetry, useInterval } from 'react-use'
import stableHash from 'stable-hash'

import { IChainAccount, INetwork } from '~lib/schema'
import { getSuiClient } from '~lib/services/provider/sui/client'

export function useSuiTransaction(
  network?: INetwork,
  account?: IChainAccount,
  tx?: TransactionBlock
): DryRunTransactionBlockResponse | false | undefined {
  const { value, loading, error, retry } = useAsyncRetry(async () => {
    if (!network || !account?.address || !tx) {
      return
    }

    const client = await getSuiClient(network)

    return client.dryRunTransactionBlock({
      transactionBlock: await tx.build({ client })
    })
  }, [network, account, tx])

  useInterval(retry, !loading ? 30000 : null)

  const [dryRun, setDryRun] = useState<
    DryRunTransactionBlockResponse | false | undefined
  >()

  useEffect(() => {
    if (error) {
      setDryRun(false)
    } else {
      setDryRun((dryRun) => {
        if (stableHash(value) === stableHash(dryRun)) {
          return dryRun
        } else {
          return value
        }
      })
    }
  }, [value, error])

  return dryRun
}
