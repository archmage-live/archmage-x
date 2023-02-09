import { fromBech32 } from '@cosmjs/encoding'
import {
  StringEvent,
  TxResponse
} from 'cosmjs-types/cosmos/base/abci/v1beta1/abci'
import { Tx } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { Any } from 'cosmjs-types/google/protobuf/any'
import Decimal from 'decimal.js'

import { CosmAppChainInfo } from '~lib/network/cosm'
import { Coin } from '~lib/network/cosm/coin'
import { Dec } from '~lib/network/cosm/number'
import { shortenAddress } from '~lib/utils'

export interface CosmMsg {
  type: string
  typeUrl: string
  events: StringEvent[]
  msg: Any
}

export interface CosmTx extends TxResponse {
  msgs?: CosmMsg[]
}

export function parseCosmTx(tx: Tx, txResponse: TxResponse): CosmTx {
  const msgs = tx.body?.messages.map((msg, i) => {
    const cosmMsg = {
      typeUrl: msg.typeUrl as any,
      events: txResponse.logs[i].events,
      msg
    } as CosmMsg

    cosmMsg.type =
      cosmMsgDescriptions[msg.typeUrl]?.[0] ||
      msg.typeUrl.split('.').pop() ||
      'Unknown'

    return cosmMsg
  })

  return {
    msgs,
    ...txResponse
  }
}

function extractEventAttributes(
  events: {
    type: string
    attributes: { key: string; value: string }[]
  }[],
  type: string
): Map<string, string> | undefined {
  const event = events.find((event) => event.type === type)
  if (!event) {
    return
  }
  const result = new Map<string, string>()
  event.attributes.forEach((attr) => {
    result.set(attr.key, attr.value)
  })
  return result
}

function formatCosmCoin(coin: string | undefined, info: CosmAppChainInfo) {
  if (!coin) {
    return ''
  }
  const c = Coin.fromString(coin)
  const currency = info.currencies.find(
    (currency) => currency.coinMinimalDenom === c.denom
  )
  if (currency) {
    return `${new Dec(c.amount)
      .divPow(currency.coinDecimals)
      .toDecimalPlaces(currency.coinDecimals)
      .toString()} ${currency.coinDenom}`
  } else {
    return coin
  }
}

export function shortenCosmAddress(
  address: string,
  opts?: {
    prefixChars?: number
    suffixChars?: number
  }
): string {
  const { prefix } = fromBech32(address)
  const { prefixChars, suffixChars } = opts || {}
  return shortenAddress(address, { prefixChars, suffixChars })
}

const cosmMsgDescriptions: {
  [typeUrl: string]: [string, (msg: CosmMsg, chain: CosmAppChainInfo) => string]
} = {
  '/cosmos.bank.v1beta1.MsgSend': ['Send', msgSendTx],
  '/ibc.applications.transfer.v1.MsgTransfer': ['IBC Transfer', msgTransfer],
  '/ibc.core.channel.v1.MsgRecvPacket': ['IBC Receive', msgRecvPacket],
  '/ibc.core.channel.v1.MsgAcknowledgement': [
    'IBC Acknowledgement',
    msgAcknowledgement
  ],
  '/ibc.core.channel.v1.MsgTimeout': ['IBC Timeout', msgTimeout],
  '/ibc.core.channel.v1.MsgTimeoutOnClose': ['IBC Timeout', msgTimeoutOnClose]
}

function msgSendTx(msg: CosmMsg, chain: CosmAppChainInfo) {
  const attrs = extractEventAttributes(msg.events, 'transfer')
  const amount = formatCosmCoin(attrs?.get('amount'), chain)
  const recipient = attrs?.get('recipient')
  const recipientShort = recipient && shortenCosmAddress(recipient)
  return `Send ${amount} to ${recipientShort}`
}

/****************************** staking ******************************/

function msgCreateValidator(msg: CosmMsg, chain: CosmAppChainInfo) {
  const attrs = extractEventAttributes(msg.events, 'create_validator')
  const validator = attrs?.get('validator')
  const validatorShort = validator && shortenCosmAddress(validator)
  const amount = formatCosmCoin(attrs?.get('amount'), chain)
  return `Create validator ${validatorShort} and delegate ${amount}`
}

function msgEditValidator(msg: CosmMsg, chain: CosmAppChainInfo) {
  const attrs = extractEventAttributes(msg.events, 'edit_validator')
}

/****************************** ibc ******************************/

function msgTransfer(msg: CosmMsg, chain: CosmAppChainInfo) {}

function msgRecvPacket(msg: CosmMsg, chain: CosmAppChainInfo) {
  const attrs = extractEventAttributes(msg.events, 'edit_validator')
}

function msgAcknowledgement(msg: CosmMsg, chain: CosmAppChainInfo) {
  const attrs = extractEventAttributes(msg.events, 'edit_validator')
}

function msgTimeout(msg: CosmMsg, chain: CosmAppChainInfo) {
  const attrs = extractEventAttributes(msg.events, 'edit_validator')
}

function msgTimeoutOnClose(msg: CosmMsg, chain: CosmAppChainInfo) {
  const attrs = extractEventAttributes(msg.events, 'edit_validator')
}
