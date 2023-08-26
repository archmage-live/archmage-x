import assert from 'assert'
import { useAsyncRetry, useInterval } from 'react-use'
import { Account, Sequencer, Signer, TransactionType } from 'starknet'

import { IChainAccount, INetwork } from '~lib/schema'
import { getSigningWallet } from '~lib/wallet'

import { getStarknetClient } from './client'
import { StarknetVoidSigner } from './provider'
import { StarknetTransactionPayload } from './types'

export function useStarknetTransaction(
  network?: INetwork,
  account?: IChainAccount,
  payload?: StarknetTransactionPayload
): Sequencer.TransactionTraceResponse | undefined {
  const { value, loading, retry } = useAsyncRetry(async () => {
    if (!network || !account?.address || !payload) {
      return
    }
    const provider = await getStarknetClient(network)

    /* const signer = await getSigningWallet(account)
    if (!signer) {
      return
    }
    const starkSigner = new Signer(signer.privateKey) */

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

  useInterval(retry, !loading ? 10000 : null)

  return value
}
