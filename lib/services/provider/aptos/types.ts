import { arrayify } from '@ethersproject/bytes'
import { BCS, TxnBuilderTypes, Types } from 'aptos'

import { TransactionPayload } from '~lib/services/provider'

export enum AptosPayloadType {
  ENTRY_FUNCTION = 'entryFunction',
  SCRIPT = 'script',
  MODULE_BUNDLE = 'moduleBundle'
}

export function isAptosEntryFunctionPayload(
  payload: Types.TransactionPayload
): payload is Types.TransactionPayload_EntryFunctionPayload {
  return payload.type === 'entry_function_payload'
  // return !!(payload as Types.TransactionPayload_EntryFunctionPayload).function
}

export function isAptosScriptPayload(
  payload: Types.TransactionPayload
): payload is Types.TransactionPayload_ScriptPayload {
  return payload.type === 'script_payload'
  // return !!(payload as Types.TransactionPayload_ScriptPayload).code
}

export function isAptosModuleBundlePayload(
  payload: Types.TransactionPayload
): payload is Types.TransactionPayload_ModuleBundlePayload {
  return payload.type === 'module_bundle_payload'
  // return !!(payload as Types.TransactionPayload_ModuleBundlePayload).modules
}

export interface SignMessagePayload {
  address?: boolean // Should we include the address of the account in the message
  application?: boolean // Should we include the domain of the dApp
  chainId?: boolean // Should we include the current chain id the wallet is connected to
  message: string // The message to be signed and displayed to the user
  nonce: string | number // A nonce the dApp should generate
}

export interface SignMessageResponse {
  address?: string
  application?: string
  chainId?: number
  fullMessage: string // The message that was generated to sign
  message: string // The message passed in by the user
  nonce: string
  prefix: string // Should always be APTOS
  signature: string | string[] // The signed full message
  bitmap?: Uint8Array // a 4-byte (32 bits) bit-vector of length N
}

export function formatAptosTxParams(payload: {
  txParams?: string | TxnBuilderTypes.RawTransaction
  populatedParams?: Types.UserTransaction
}): TransactionPayload {
  const { txParams } = payload

  if (txParams && !(txParams instanceof TxnBuilderTypes.RawTransaction)) {
    const deserializer = new BCS.Deserializer(arrayify(txParams))
    payload = {
      ...payload,
      txParams: TxnBuilderTypes.RawTransaction.deserialize(deserializer)
    }
  }

  return payload as TransactionPayload
}
