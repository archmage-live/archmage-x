import { Pubkey } from '@cosmjs/amino'
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate'
import { PageRequest } from 'cosmjs-types/cosmos/base/query/v1beta1/pagination'
import { SignMode } from 'cosmjs-types/cosmos/tx/signing/v1beta1/signing'
import {
  GetTxRequest,
  GetTxResponse,
  GetTxsEventRequest,
  GetTxsEventResponse,
  OrderBy,
  ServiceClientImpl,
  SimulateRequest,
  SimulateResponse
} from 'cosmjs-types/cosmos/tx/v1beta1/service'
import {
  AuthInfo,
  Fee,
  Tx,
  TxBody,
  TxRaw
} from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { Any } from 'cosmjs-types/google/protobuf/any'
import Long from 'long'

import { encodePubkey } from '../../proto-signing'

export const EventTypeTx = 'tx'

export const EventAttributeKeyAccountSequence = 'acc_seq'
export const EventAttributeKeySignature = 'signature'
export const EventAttributeKeyFee = 'fee'

export const EventEventTypeMessage = 'message'

export const EventAttributeKeyAction = 'action'
export const EventAttributeKeyModule = 'module'
export const EventAttributeKeySender = 'sender'
export const EventAttributeKeyAmount = 'amount'

export interface Events {
  [type: string]: {
    // event type
    [key: string]: string // attributes key value
  }
}

export interface TxExtension {
  readonly tx: {
    getTx: (txId: string) => Promise<GetTxResponse>
    simulate: (
      messages: readonly Any[],
      memo: string | undefined,
      signer: Pubkey,
      sequence: number
    ) => Promise<SimulateResponse>
    simulateTx: (tx: Tx | TxRaw) => Promise<SimulateResponse>
    getTxsEvent: (
      events: Events,
      options: { offset: number; limit: number; isDesc: boolean }
    ) => Promise<GetTxsEventResponse>
  }
}

export function setupTxExtension(base: QueryClient): TxExtension {
  // Use this service to get easy typed access to query methods
  // This cannot be used for proof verification
  const rpc = createProtobufRpcClient(base)
  const queryService = new ServiceClientImpl(rpc)

  return {
    tx: {
      getTx: async (txId: string) => {
        const request: GetTxRequest = {
          hash: txId
        }
        return await queryService.GetTx(request)
      },
      simulate: async (
        messages: readonly Any[],
        memo: string | undefined,
        signer: Pubkey,
        sequence: number
      ) => {
        const tx = Tx.fromPartial({
          authInfo: AuthInfo.fromPartial({
            fee: Fee.fromPartial({}),
            signerInfos: [
              {
                publicKey: encodePubkey(signer),
                sequence: Long.fromNumber(sequence, true),
                modeInfo: { single: { mode: SignMode.SIGN_MODE_UNSPECIFIED } }
              }
            ]
          }),
          body: TxBody.fromPartial({
            messages: Array.from(messages),
            memo: memo
          }),
          signatures: [new Uint8Array()]
        })
        const request = SimulateRequest.fromPartial({
          txBytes: Tx.encode(tx).finish()
        })
        const response = await queryService.Simulate(request)
        return response
      },
      simulateTx: async (tx: Tx | TxRaw) => {
        const txBytes = (tx as TxRaw).bodyBytes
          ? TxRaw.encode(tx as TxRaw).finish()
          : Tx.encode(tx as Tx).finish()
        const request = SimulateRequest.fromPartial({
          txBytes
        })
        return await queryService.Simulate(request)
      },
      getTxsEvent: async (
        events: Events,
        options?: { offset?: number; limit?: number; isDesc?: boolean }
      ): Promise<GetTxsEventResponse> => {
        const eventList: string[] = []
        Object.entries(events).forEach(([type, attributes]) => {
          Object.entries(attributes).forEach(([key, value]) => {
            eventList.push(`${type}.${key}='${value}'`)
          })
        })

        let pagination = undefined
        if (options) {
          const { offset, limit } = options
          if (typeof offset !== typeof limit) {
            throw new Error('offset and limit can not be only specified one')
          }
          if (offset !== undefined) {
            pagination = {
              key: new Uint8Array(),
              offset: Long.fromNumber(offset),
              limit: Long.fromNumber(limit!),
              countTotal: false,
              reverse: false
            } as PageRequest
          }
        }

        const request: GetTxsEventRequest = {
          events: eventList,
          pagination,
          orderBy: !options?.isDesc
            ? OrderBy.ORDER_BY_ASC
            : OrderBy.ORDER_BY_DESC
        }
        return await queryService.GetTxsEvent(request)
      }
    }
  }
}
