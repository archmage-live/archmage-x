import { HStack, Text } from '@chakra-ui/react'
import { sha256 } from '@cosmjs/crypto'
import { fromBech32, toHex } from '@cosmjs/encoding'
import assert from 'assert'
import { DenomTrace } from 'cosmjs-types/ibc/applications/transfer/v1/transfer'
import { ReactNode } from 'react'

import { CosmAppChainInfo } from '~lib/network/cosm'
import { TokenInfo } from '~lib/services/datasource/cosmostation'
import { TransactionType } from '~lib/services/transaction'
import { shortenString } from '~lib/utils'
import { FromTo } from '~pages/Popup/Consent/Transaction/FromTo'

import { CosmMsg, CosmTxInfo } from '.'
import { extractEventAttributes, formatCosmCoin } from './util'

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

export function msgTransfer(
  msg: CosmMsg,
  chain: CosmAppChainInfo,
  account: string,
  tokenInfos?: Map<string, TokenInfo>
): { info: CosmTxInfo; node: ReactNode } {
  const attrs = extractEventAttributes(msg.events, 'send_packet')
  const packetData = JSON.parse(
    attrs?.get('packet_data')!
  ) as IbcTransferPacketData
  assert(packetData.sender === account)
  const amount = `${packetData.amount}${packetData.denom}`

  const info = {
    type: TransactionType.Send,
    name: 'IBC Transfer',
    from: packetData.sender,
    to: packetData.receiver,
    denom: packetData.denom,
    amount: packetData.amount
  }

  const node = (
    <>
      <HStack justify="space-between">
        <Text>From</Text>
        <Text>To</Text>
      </HStack>

      <FromTo
        from={packetData.sender}
        to={packetData.receiver}
        leadingChars={fromBech32(packetData.sender).prefix}
        leadingChars2={fromBech32(packetData.receiver).prefix}
      />

      <HStack justify="space-between">
        <Text>Amount</Text>
        <Text>{formatCosmCoin(amount, tokenInfos)}</Text>
      </HStack>
    </>
  )

  return { info, node }
}

export function msgRecvPacket(
  msg: CosmMsg,
  chain: CosmAppChainInfo,
  account: string,
  tokenInfos?: Map<string, TokenInfo>
): { info: CosmTxInfo; node: ReactNode } {
  const attrs = extractEventAttributes(msg.events, 'recv_packet')
  const packetData = JSON.parse(
    attrs?.get('packet_data')!
  ) as IbcTransferPacketData
  const amount = `${packetData.amount}${packetData.denom}`

  const info = {
    type: TransactionType.Receive,
    name: 'IBC Receive',
    from: packetData.sender,
    to: packetData.receiver,
    denom: packetData.denom,
    amount: packetData.amount
  }

  const node = (
    <>
      <HStack justify="space-between">
        <Text>From</Text>
        <Text>To</Text>
      </HStack>

      <FromTo
        from={packetData.sender}
        to={packetData.receiver}
        leadingChars={fromBech32(packetData.sender).prefix}
        leadingChars2={fromBech32(packetData.receiver).prefix}
      />

      <HStack justify="space-between">
        <Text>Amount</Text>
        <Text>{formatCosmCoin(amount, tokenInfos)}</Text>
      </HStack>
    </>
  )

  return { info, node }
}

export function msgAcknowledgement(
  msg: CosmMsg,
  chain: CosmAppChainInfo,
  account: string,
  tokenInfos?: Map<string, TokenInfo>
): { info: CosmTxInfo; node: ReactNode } {
  const attrs = extractEventAttributes(msg.events, 'fungible_token_packet')
  console.log(msg.events)
  const sender = attrs?.get('sender')
  const receiver = attrs?.get('receiver')
  const amount = attrs?.get('amount')
  const denom = attrs?.get('denom')
  const coin = `${amount}${denom}`
  const success = attrs?.get('success')

  const info = {
    success: success !== undefined,
    type: TransactionType.Send,
    name: 'IBC Acknowledgement',
    from: sender,
    to: receiver,
    denom,
    amount
  }

  const node = (
    <>
      <HStack justify="space-between">
        <Text>From</Text>
        <Text>To</Text>
      </HStack>

      <FromTo
        from={sender}
        to={receiver}
        leadingChars={sender && fromBech32(sender).prefix}
        leadingChars2={receiver && fromBech32(receiver).prefix}
      />

      <HStack justify="space-between">
        <Text>Amount</Text>
        <Text>{formatCosmCoin(coin, tokenInfos)}</Text>
      </HStack>
    </>
  )

  return { info, node }
}

export function msgTimeout(
  msg: CosmMsg,
  chain: CosmAppChainInfo,
  account: string,
  tokenInfos?: Map<string, TokenInfo>
): { info: CosmTxInfo; node: ReactNode } {
  const attrs = extractEventAttributes(msg.events, 'fungible_token_packet')
  const refundReceiver = attrs?.get('refund_receiver')
  const amount = attrs?.get('refund_amount')
  const denom = attrs?.get('refund_denom')
  const coin = `${amount}${denom}`

  const info = {
    success: false,
    type: TransactionType.Send,
    name: 'IBC Timeout',
    from: refundReceiver,
    to: undefined,
    denom,
    amount,
    description: `Timeout of transferring ${coin}`
  }

  const node = (
    <>
      <HStack justify="space-between">
        <Text>Refund Receiver</Text>
        <Text>
          {shortenString(refundReceiver, {
            leadingChars: refundReceiver && fromBech32(refundReceiver).prefix
          })}
        </Text>
      </HStack>

      <HStack justify="space-between">
        <Text>Amount</Text>
        <Text>{formatCosmCoin(coin, tokenInfos)}</Text>
      </HStack>
    </>
  )

  return { info, node }
}

export function msgTimeoutOnClose(
  msg: CosmMsg,
  chain: CosmAppChainInfo,
  account: string,
  tokenInfos?: Map<string, TokenInfo>
): { info: CosmTxInfo; node: ReactNode } {
  return msgTimeout(msg, chain, account)
}
