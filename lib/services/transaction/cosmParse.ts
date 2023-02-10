import { sha256 } from '@cosmjs/crypto'
import { fromBech32, toHex } from '@cosmjs/encoding'
import assert from 'assert'
import {
  StringEvent,
  TxResponse
} from 'cosmjs-types/cosmos/base/abci/v1beta1/abci'
import { Tx } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { Any } from 'cosmjs-types/google/protobuf/any'
import { DenomTrace } from 'cosmjs-types/ibc/applications/transfer/v1/transfer'

import { CosmAppChainInfo } from '~lib/network/cosm'
import { Coin } from '~lib/network/cosm/coin'
import { Dec } from '~lib/network/cosm/number'
import { shortenAddress } from '~lib/utils'

import { TransactionType } from '.'

export interface CosmTxInfo {
  success?: boolean
  type: TransactionType
  name?: string
  from?: string
  to?: string
  amount?: string
  description?: string
}

export interface CosmMsg {
  type: string
  typeUrl: string
  events: StringEvent[]
  msg: Any
}

export function parseCosmTx(
  tx: Tx,
  txResponse: TxResponse,
  chain: CosmAppChainInfo,
  account: string
): CosmTxInfo & {
  msgs: CosmMsg[]
} {
  let txInfo: CosmTxInfo | undefined

  const msgs =
    tx.body?.messages.map((msg, i) => {
      const cosmMsg = {
        typeUrl: msg.typeUrl as any,
        events: txResponse.logs[i].events,
        msg
      } as CosmMsg

      const parse = cosmMsgDescriptions[msg.typeUrl]
      const info = parse ? parse(cosmMsg, chain, account) : undefined

      if (info && !txInfo) {
        txInfo = info
      }

      cosmMsg.type = info?.name || msg.typeUrl.split('.').pop() || 'Unknown'

      return cosmMsg
    }) || []

  return {
    success: txResponse.code === 0 ? (txInfo ? txInfo.success : true) : false,
    type: txInfo?.type || TransactionType.CallContract,
    name: txInfo?.name || msgs[0].type,
    from: txInfo?.from,
    to: txInfo?.to,
    amount: txInfo?.amount,
    description: txInfo?.description,
    msgs
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
  address?: string,
  opts?: {
    prefixChars?: number
    suffixChars?: number
  }
): string {
  if (!address) {
    return ''
  }
  const { prefix } = fromBech32(address)
  const { prefixChars, suffixChars } = opts || {}
  return shortenAddress(address, {
    leadingChars: prefix,
    prefixChars,
    suffixChars
  })
}

const cosmMsgDescriptions: {
  [typeUrl: string]: (
    msg: CosmMsg,
    chain: CosmAppChainInfo,
    account: string
  ) => CosmTxInfo
} = {
  '/cosmos.bank.v1beta1.MsgSend': msgSendTx,
  '/ibc.applications.transfer.v1.MsgTransfer': msgTransfer,
  '/ibc.core.channel.v1.MsgRecvPacket': msgRecvPacket,
  '/ibc.core.channel.v1.MsgAcknowledgement': msgAcknowledgement,
  '/ibc.core.channel.v1.MsgTimeout': msgTimeout,
  '/ibc.core.channel.v1.MsgTimeoutOnClose': msgTimeoutOnClose
}

function msgSendTx(
  msg: CosmMsg,
  chain: CosmAppChainInfo,
  account: string
): CosmTxInfo {
  const attrs = extractEventAttributes(msg.events, 'transfer')
  const amount = formatCosmCoin(attrs?.get('amount'), chain)
  const sender = attrs?.get('sender')
  const recipient = attrs?.get('recipient')

  const type =
    account === recipient ? TransactionType.Receive : TransactionType.Send

  return {
    type,
    name: type === TransactionType.Send ? 'Send' : 'Receive',
    from: sender,
    to: recipient,
    amount,
    description:
      type === TransactionType.Send
        ? `Send ${amount} to ${shortenCosmAddress(recipient)}`
        : `Receive ${amount} from ${shortenCosmAddress(sender)}`
  }
}

/****************************** staking ******************************/

function msgCreateValidator(msg: CosmMsg, chain: CosmAppChainInfo) {
  const attrs = extractEventAttributes(msg.events, 'create_validator')
  const validator = attrs?.get('validator')
  const amount = formatCosmCoin(attrs?.get('amount'), chain)
  return `Create validator ${shortenCosmAddress(
    validator
  )} and delegate ${amount}`
}

function msgEditValidator(msg: CosmMsg, chain: CosmAppChainInfo) {
  const attrs = extractEventAttributes(msg.events, 'edit_validator')
  // TODO
}

/****************************** ibc ******************************/

interface IbcTransferPacketData {
  sender: string
  receiver: string
  amount: string
  denom: string
}

export function parseDenomTrace(denom: string): DenomTrace {
  const splits = denom.split('/')
  if (splits.length >= 3 && splits.length % 2 === 1) {
    return {
      path: splits.slice(0, splits.length - 1).join('/'),
      baseDenom: splits[splits.length - 1]
    }
  } else {
    return {
      path: '',
      baseDenom: denom
    }
  }
}

export function toIbcDenom(denom: string) {
  const dt = parseDenomTrace(denom)
  if (dt.path) {
    return 'ibc/' + toHex(sha256(Buffer.from(denom))).toUpperCase()
  } else {
    return dt.baseDenom
  }
}

function msgTransfer(
  msg: CosmMsg,
  chain: CosmAppChainInfo,
  account: string
): CosmTxInfo {
  const attrs = extractEventAttributes(msg.events, 'send_packet')
  const packetData = JSON.parse(
    attrs?.get('packet_data')!
  ) as IbcTransferPacketData
  assert(packetData.sender === account)
  const amount = `${packetData.amount} ${packetData.denom}`

  return {
    type: TransactionType.Send,
    name: 'IBC Transfer',
    from: packetData.sender,
    to: packetData.receiver,
    amount,
    description: `Transfer ${amount} to ${shortenCosmAddress(
      packetData.receiver
    )}`
  }
}

function msgRecvPacket(
  msg: CosmMsg,
  chain: CosmAppChainInfo,
  account: string
): CosmTxInfo {
  const attrs = extractEventAttributes(msg.events, 'recv_packet')
  const packetData = JSON.parse(
    attrs?.get('packet_data')!
  ) as IbcTransferPacketData
  assert(packetData.receiver === account)
  const amount = `${packetData.amount} ${packetData.denom}`

  return {
    type: TransactionType.Receive,
    name: 'IBC Receive',
    from: packetData.sender,
    to: packetData.receiver,
    amount,
    description: `Receive ${amount} from ${shortenCosmAddress(
      packetData.sender
    )}`
  }
}

function msgAcknowledgement(
  msg: CosmMsg,
  chain: CosmAppChainInfo,
  account: string
): CosmTxInfo {
  const attrs = extractEventAttributes(msg.events, 'fungible_token_packet')
  const sender = attrs?.get('sender')
  assert(sender === account)
  const receiver = attrs?.get('receiver')
  const amount = `${attrs?.get('amount')} ${attrs?.get('denom')}`
  const success = attrs?.get('success')

  return {
    success: success !== undefined,
    type: TransactionType.Send,
    name: 'IBC Acknowledgement',
    from: sender,
    to: receiver,
    amount,
    description: `Acknowledgement of transferring ${amount} to ${shortenCosmAddress(
      receiver
    )}`
  }
}

function msgTimeout(
  msg: CosmMsg,
  chain: CosmAppChainInfo,
  account: string
): CosmTxInfo {
  const attrs = extractEventAttributes(msg.events, 'fungible_token_packet')
  const refundReceiver = attrs?.get('refund_receiver')
  assert(refundReceiver === account)
  const amount = `${attrs?.get('refund_amount')} ${attrs?.get('refund_denom')}`

  return {
    success: false,
    type: TransactionType.Send,
    name: 'IBC Timeout',
    from: account,
    to: undefined,
    amount,
    description: `Timeout of transferring ${amount}`
  }
}

function msgTimeoutOnClose(
  msg: CosmMsg,
  chain: CosmAppChainInfo,
  account: string
): CosmTxInfo {
  return msgTimeout(msg, chain, account)
}
