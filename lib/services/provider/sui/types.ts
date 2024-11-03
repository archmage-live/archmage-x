import { Transaction } from '@mysten/sui/transactions'

import { TransactionPayload } from '~lib/services/provider'

export interface SuiTransactionPayload extends TransactionPayload {
  txParams: Transaction | string
  populatedParams: undefined
}

export function deserializeSuiTxPayload(
  payload: SuiTransactionPayload
): SuiTransactionPayload {
  const { txParams } = payload

  if (typeof txParams === 'string') {
    payload.txParams = Transaction.from(txParams)
  }

  return payload
}

export async function serializeSuiTxPayload(
  payload: SuiTransactionPayload
): Promise<SuiTransactionPayload> {
  const { txParams } = payload

  if (txParams instanceof Transaction) {
    payload.txParams = await txParams.toJSON()
  }

  return payload
}
