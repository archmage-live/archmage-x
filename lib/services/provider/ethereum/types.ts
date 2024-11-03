import json from 'json-bigint'
import { AbiFunction, AccessList, Address, Hex } from 'viem'

import { assert } from '~archmage/errors'
import { TransactionPayload } from '~lib/services/provider'

export interface EthTransactionPayload extends TransactionPayload {
  txParams: EthTxParams
  populatedParams: EthTxPopulatedParams
}

export type EthTxParams = {
  to?: Address
  from?: Address
  nonce?: number // ignored from user

  gas?: bigint // gas limit
  gasPrice?: bigint

  data?: Hex
  vale?: bigint
  chainId?: number

  type?: number
  accessList?: AccessList

  maxPriorityFeePerGas?: bigint
  maxFeePerGas?: bigint
  maxFeePerBlobGas?: bigint
}

export type EthTxPopulatedParams = {
  signature?: AbiFunction

  gasPrice?: bigint
  maxPriorityFeePerGas?: bigint
  maxFeePerGas?: bigint

  code?: string
  error?: string
}

export function serializeEthTxPayload(payload: EthTransactionPayload) {
  return json.stringify(payload) as unknown as TransactionPayload
}

export function deserializeEthTxPayload(payloadStr: TransactionPayload) {
  const payload: EthTransactionPayload = json({
    useNativeBigInt: true
  }).parse(payloadStr as unknown as string)

  const txParams = payload.txParams
  const populatedParams = payload.populatedParams

  assert(typeof txParams.nonce !== 'bigint', 'nonce must be a number')
  assert(typeof txParams.chainId !== 'bigint', 'gas must be a number')
  assert(typeof txParams.type !== 'bigint', 'type must be a number')
  assert(
    typeof populatedParams.signature?.gas !== 'bigint',
    'gas must be a number'
  )

  return payload
}
