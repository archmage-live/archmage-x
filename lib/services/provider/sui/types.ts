import { TransactionBlock } from '@mysten/sui.js/transactions'

import { TransactionPayload } from '~lib/services/provider'

export interface SuiTransactionPayload extends TransactionPayload {
  txParams: TransactionBlock | string
  populatedParams: undefined
}

export function formatSuiTxPayload(
  payload: SuiTransactionPayload
): SuiTransactionPayload {
  let { txParams, populatedParams } = payload

  if (typeof txParams === 'string') {
    txParams = TransactionBlock.from(txParams)
  }

  return {
    txParams,
    populatedParams
  }
}

export function compactSuiTxPayload(
  payload: SuiTransactionPayload
): SuiTransactionPayload {
  const { txParams } = payload

  if (txParams instanceof TransactionBlock) {
    payload.txParams = txParams.serialize()
  }

  return payload
}
