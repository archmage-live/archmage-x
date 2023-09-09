import { TransactionPayload } from "~lib/services/provider";
import { TransactionBlock } from "@mysten/sui.js/transactions";

export interface SuiTransactionPayload extends TransactionPayload {
  txParams: TransactionBlock | string
  populatedParams: undefined
}

export function formatSuiTxParams(payload: SuiTransactionPayload) {
  let { txParams, populatedParams } = payload

  if (typeof txParams === 'string') {
    txParams = TransactionBlock.from(txParams)
  }

  return {
    txParams,
    populatedParams
  }
}
