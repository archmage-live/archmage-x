import { Types } from 'aptos'

import {
  AptosPayloadType,
  isEntryFunctionPayload,
  isScriptPayload
} from '~lib/services/provider/aptos/types'

import { TransactionType } from '.'

export const APTOS_COIN = '0x1::aptos_coin::AptosCoin'

interface AptosTxInfo {
  success: boolean
  type: TransactionType
  payloadType: AptosPayloadType
  function?: string
  functionShort?: string
  to?: string
  amount?: string
  coinEvents: Map<string, Map<string, string>> // account -> coinType -> (+/-)value
}

export function parseAptosTxInfo(
  account: string,
  tx: Types.Transaction_UserTransaction
): AptosTxInfo {
  let type, payloadType, fun, funShort
  let to, amount

  const payload = tx.payload
  if (isEntryFunctionPayload(payload)) {
    type = TransactionType.CallContract
    payloadType = AptosPayloadType.ENTRY_FUNCTION

    fun = payload.function
    funShort = extractLastName(fun)

    if (tx.sender !== account) {
      type = TransactionType.Receive
    }

    if (
      (payload.function === '0x1::coin::transfer' &&
        payload.type_arguments[0] === APTOS_COIN) ||
      payload.function === '0x1::aptos_account::transfer'
    ) {
      to = payload.arguments[0]
      amount = payload.arguments[1]

      if (tx.sender === account) {
        type = TransactionType.Send
      }
    }
  } else if (isScriptPayload(payload)) {
    type = TransactionType.CallContract
    payloadType = AptosPayloadType.SCRIPT
  } else {
    type = TransactionType.DeployContract
    payloadType = AptosPayloadType.MODULE_BUNDLE
  }

  const coinTypesByEvents = new Map<string, Map<string, AptosCoinType>>()
  for (const change of tx.changes as Types.WriteSetChange_WriteResource[]) {
    if (change.type !== 'write_resource') {
      continue
    }

    const coinType = parseCoin(change.data.type)
    if (!coinType) {
      continue
    }

    const coinStore = change.data.data as AptosCoinStore

    if (coinStore.deposit_events) {
      const { addr, creation_num } = coinStore.deposit_events.guid.id
      let coinTypesByCreationNum = coinTypesByEvents.get(addr)
      if (!coinTypesByCreationNum) {
        coinTypesByCreationNum = new Map()
        coinTypesByEvents.set(addr, coinTypesByCreationNum)
      }
      coinTypesByCreationNum.set(creation_num, coinType)
    }

    if (coinStore.withdraw_events) {
      const { addr, creation_num } = coinStore.withdraw_events.guid.id
      let coinTypesByCreationNum = coinTypesByEvents.get(addr)
      if (!coinTypesByCreationNum) {
        coinTypesByCreationNum = new Map()
        coinTypesByEvents.set(addr, coinTypesByCreationNum)
      }
      coinTypesByCreationNum.set(creation_num, coinType)
    }
  }

  const coinEvents = new Map<string, Map<string, string>>()
  for (const event of tx.events) {
    const { account_address, creation_number } = event.guid

    let coinType, value
    if (event.type === '0x1::coin::DepositEvent') {
      coinType = coinTypesByEvents.get(account_address)?.get(creation_number)
      const deposit = event.data as AptosDepositEvent
      value = deposit.amount
    } else if (event.type === '0x1::coin::WithdrawEvent') {
      coinType = coinTypesByEvents.get(account_address)?.get(creation_number)
      const withdraw = event.data as AptosWithdrawEvent
      value = '-' + withdraw.amount
    } else {
      continue
    }

    if (coinType && value) {
      let eventsByAddr = coinEvents.get(account_address)
      if (!eventsByAddr) {
        eventsByAddr = new Map()
        coinEvents.set(account_address, eventsByAddr)
      }
      const existingValue = eventsByAddr.get(coinType.type)
      if (existingValue) {
        value = (BigInt(value) + BigInt(existingValue)).toString()
      }
      eventsByAddr.set(coinType.type, value)
    }
  }

  return {
    success: tx.success,
    type,
    payloadType,
    function: fun,
    functionShort: funShort,
    to,
    amount,
    coinEvents
  } as AptosTxInfo
}

type AptosCoinStore = {
  coin: {
    value: string
  }
  frozen: boolean
  deposit_events: AptosEventHandle
  withdraw_events: AptosEventHandle
}

type AptosEventHandle = {
  counter: string
  guid: {
    id: {
      creation_num: string
      addr: string
    }
  }
}

type AptosDepositEvent = {
  amount: string
}

type AptosWithdrawEvent = {
  amount: string
}

interface AptosCoinType {
  type: string
  name: string
}

enum AptosCoinEvent {
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw'
}

const coinTypeRe = /^0x1::coin::CoinStore<(.*)>$/

export function parseCoin(input: string) {
  const result = coinTypeRe.exec(input)
  if (!result) {
    return
  }

  const type = result[1]
  const name = extractLastName(type)

  return {
    type,
    name
  } as AptosCoinType
}

function extractLastName(input: string) {
  return input.slice(input.lastIndexOf(':') + 1)
}
