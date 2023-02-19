import { TxnBuilderTypes, Types } from 'aptos'
import { useAsyncRetry, useInterval } from 'react-use'

import { IChainAccount, INetwork } from '~lib/schema'
import { getAptosClient } from '~lib/services/provider/aptos/client'
import { AptosProvider } from '~lib/services/provider/aptos/provider'

export function useAptosTransaction(
  network?: INetwork,
  account?: IChainAccount,
  rawTx?: TxnBuilderTypes.RawTransaction,
  dontEstimateGasPrice?: boolean,
  dontEstimateGasLimit?: boolean,
  expirationSecs?: number
) {
  const { value, loading, retry } = useAsyncRetry(async () => {
    if (!network || !account || !rawTx) {
      return
    }
    const client = await getAptosClient(network)
    if (!client) {
      return
    }

    const provider = new AptosProvider(client)

    let {
      sender,
      sequence_number,
      payload,
      max_gas_amount,
      gas_unit_price,
      expiration_timestamp_secs,
      chain_id
    } = rawTx

    if (typeof expirationSecs === 'number') {
      const expireTimestamp = Math.floor(Date.now() / 1000) + expirationSecs
      expiration_timestamp_secs = BigInt(expireTimestamp)
    }
    const rawTransaction = new TxnBuilderTypes.RawTransaction(
      sender,
      sequence_number,
      payload,
      max_gas_amount,
      gas_unit_price,
      expiration_timestamp_secs,
      chain_id
    )

    const userTxs = await provider.simulateTransaction(
      account,
      rawTransaction,
      {
        estimateGasUnitPrice: !dontEstimateGasPrice,
        estimateMaxGasAmount: !dontEstimateGasLimit,
        estimatePrioritizedGasUnitPrice: false // TODO
      }
    )
    const userTransaction = userTxs[0]

    console.log(userTransaction)

    return {
      rawTransaction,
      userTransaction
    } as {
      rawTransaction: TxnBuilderTypes.RawTransaction
      userTransaction: Types.UserTransaction
    }
  }, [
    network,
    account,
    rawTx,
    expirationSecs,
    dontEstimateGasPrice,
    dontEstimateGasLimit
  ])

  useInterval(retry, !loading ? 5000 : null)

  return value
}
