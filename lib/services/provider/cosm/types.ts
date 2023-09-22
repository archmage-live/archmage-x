import { StdSignDoc } from '@cosmjs/amino'
import { SignDoc } from 'cosmjs-types/cosmos/tx/v1beta1/tx'

import { CosmSignDoc, isCosmSignDoc, toSignDoc } from '~lib/inject/cosm'
import { TransactionPayload } from '~lib/services/provider'

export function formatCosmTxPayload(payload: {
  txParams: CosmSignDoc | SignDoc | StdSignDoc
  populatedParams: any
}): TransactionPayload {
  const { txParams } = payload

  if (isCosmSignDoc(txParams)) {
    payload.txParams = toSignDoc(txParams)
  }

  return payload
}
