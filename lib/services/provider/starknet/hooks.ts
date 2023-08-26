import assert from 'assert'
import { useEffect, useState } from 'react'
import { useAsyncRetry, useInterval } from 'react-use'
import stableHash from 'stable-hash'
import { Account, Sequencer, TransactionType } from 'starknet'

import { IChainAccount, INetwork } from '~lib/schema'

import { getStarknetClient } from './client'
import { StarknetVoidSigner } from './provider'
import { StarknetTransactionPayload } from './types'

export function useStarknetTransaction(
  network?: INetwork,
  account?: IChainAccount,
  payload?: StarknetTransactionPayload
): Sequencer.TransactionTraceResponse | false | undefined {
  const { value, loading, error, retry } = useAsyncRetry(async () => {
    if (!network || !account?.address || !payload) {
      return
    }
    const provider = await getStarknetClient(network)

    const acc = new Account(provider, account.address, new StarknetVoidSigner())

    const { txParams, populatedParams } = payload
    switch (txParams.type) {
      case TransactionType.DECLARE:
      case TransactionType.DEPLOY_ACCOUNT:
      case TransactionType.INVOKE: {
        assert(populatedParams.type === txParams.type)
        const rep = await acc.simulateTransaction([txParams], {
          nonce: populatedParams.details.nonce,
          skipValidate: true
        })
        return rep.at(0)
          ?.transaction_trace as Sequencer.TransactionTraceResponse
      }
    }
  }, [network, account, payload])

  useInterval(retry, !loading ? 30000 : null)

  const [trace, setTrace] = useState<
    Sequencer.TransactionTraceResponse | false | undefined
  >()
  useEffect(() => {
    if (error) {
      setTrace(false)
    } else {
      setTrace((trace) => {
        if (stableHash(value) === stableHash(trace)) {
          return trace
        } else {
          return value
        }
      })
    }
  }, [value, error])

  return trace
}
