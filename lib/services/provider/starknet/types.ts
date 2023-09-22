import {
  Call,
  DeclareContractPayload,
  DeclareSignerDetails,
  DeployAccountContractPayload,
  DeployAccountSignerDetails,
  InvocationsDetails,
  InvocationsSignerDetails,
  TransactionType
} from 'starknet'

import { TransactionPayload } from '~lib/services/provider'
import { stringifyBigNumberish } from '~lib/utils'

type Payload<T> = { payload: T }
type Details<T> = { details: T }
type Type = Omit<TransactionType, TransactionType.DEPLOY>

export enum SignType {
  INVOKE = 'SIGN_INVOKE_FUNCTION',
  DECLARE = 'SIGN_DECLARE',
  DEPLOY_ACCOUNT = 'SIGN_DEPLOY_ACCOUNT'
}

export type StarknetTxParams =
  | ((
      | ({ type: TransactionType.DECLARE } & Payload<DeclareContractPayload>)
      | ({
          type: TransactionType.DEPLOY_ACCOUNT
        } & Payload<DeployAccountContractPayload>)
      | ({ type: TransactionType.INVOKE } & Payload<Call[]>)
    ) & {
      details?: InvocationsDetails
    })
  | ({ type: SignType.DECLARE } & Details<DeclareSignerDetails>)
  | ({ type: SignType.DEPLOY_ACCOUNT } & Details<DeployAccountSignerDetails>)
  | ({ type: SignType.INVOKE } & Details<[Call[], InvocationsSignerDetails]>)

export type StarknetTxPopulatedParams =
  | ({ type: TransactionType.DECLARE } & Details<DeclareSignerDetails>)
  | ({
      type: TransactionType.DEPLOY_ACCOUNT
    } & Details<DeployAccountSignerDetails>)
  | ({ type: TransactionType.INVOKE } & Details<InvocationsSignerDetails>)
  | { type: SignType.DECLARE }
  | { type: SignType.DEPLOY_ACCOUNT }
  | { type: SignType.INVOKE }

export interface StarknetTransactionPayload extends TransactionPayload {
  txParams: StarknetTxParams
  populatedParams: StarknetTxPopulatedParams
}

export function formatStarknetTxPayload(
  payload: StarknetTransactionPayload
): TransactionPayload {
  const { txParams, populatedParams } = payload

  payload.txParams = stringifyBigNumberish(txParams)
  payload.populatedParams = stringifyBigNumberish(populatedParams)

  return payload
}
