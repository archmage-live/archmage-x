import { TransactionBlock } from '@mysten/sui.js/transactions'

import { TransactionPayload } from '~lib/services/provider'

export interface SuiTransactionPayload extends TransactionPayload {
  txParams: TransactionBlock | string
  populatedParams: undefined
}

export function formatSuiTxPayload(
  payload: SuiTransactionPayload
): SuiTransactionPayload {
  const { txParams } = payload

  if (typeof txParams === 'string') {
    payload.txParams = TransactionBlock.from(txParams)
  }

  return payload
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
