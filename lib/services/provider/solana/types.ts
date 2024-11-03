import { arrayify, hexlify } from '@ethersproject/bytes'
import { VersionedTransaction } from '@solana/web3.js'

import { TransactionPayload } from '~lib/services/provider'

export interface SolanaTransactionPayload extends TransactionPayload {
  txParams: VersionedTransaction[] | string[]
  populatedParams: undefined
}

export function deserializeSolanaTxPayload(
  payload: SolanaTransactionPayload
): SolanaTransactionPayload {
  const { txParams } = payload

  if (typeof txParams[0] === 'string') {
    payload.txParams = txParams.map((txParams) =>
      VersionedTransaction.deserialize(arrayify(txParams as string))
    )
  }

  return payload
}

export function serializeSolanaTxPayload(
  payload: SolanaTransactionPayload
): SolanaTransactionPayload {
  const { txParams } = payload

  if (typeof txParams[0] === 'object') {
    payload.txParams = txParams.map((txParams) =>
      hexlify((txParams as VersionedTransaction).serialize())
    )
  }

  return payload
}
