import { HexString, Types } from 'aptos'

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

export class FakeAptosAccount {
  constructor(private publicKey: HexString) {}

  pubKey(): HexString {
    return this.publicKey
  }
}
