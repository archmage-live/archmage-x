import { OptionalTransactionArgs, TxnBuilderTypes, Types } from 'aptos'

export function isEntryFunctionPayload(
  payload: Types.TransactionPayload
): payload is Types.TransactionPayload_EntryFunctionPayload {
  return !!(payload as Types.TransactionPayload_EntryFunctionPayload).function
}

export function isModuleBundlePayload(
  payload: Types.TransactionPayload
): payload is Types.TransactionPayload_ModuleBundlePayload {
  return !!(payload as Types.TransactionPayload_ModuleBundlePayload).modules
}

export function isScriptPayload(
  payload: Types.TransactionPayload
): payload is Types.TransactionPayload_ScriptPayload {
  return !!(payload as Types.TransactionPayload_ScriptPayload).code
}
