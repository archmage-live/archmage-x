import {
  Abi,
  Call,
  DeclareSignerDetails,
  DeployAccountSignerDetails,
  InvocationsSignerDetails
} from 'starknet'

import { TransactionPayload } from '~lib/services/provider'

export type StarknetTxParams = {
  regularTx?: [Call[], InvocationsSignerDetails, Abi[]]
  deployAccountTx?: DeployAccountSignerDetails
  declareAccountTx?: DeclareSignerDetails
}

export function formatStarknetTxParams(payload: {
  txParams: StarknetTxParams
  populatedParams: any
}): TransactionPayload {
  const { txParams, populatedParams } = payload

  return {
    txParams,
    populatedParams
  }
}
