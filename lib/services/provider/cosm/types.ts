import { TransactionPayload } from '~lib/services/provider'

export function formatCosmTxParams(payload: {
  txParams: any
  populatedParams: any
}): TransactionPayload {
  const { txParams, populatedParams } = payload

  return {
    txParams,
    populatedParams
  }
}
