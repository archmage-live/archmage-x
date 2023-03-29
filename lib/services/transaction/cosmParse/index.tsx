import {
  ABCIMessageLog,
  StringEvent,
  TxResponse
} from 'cosmjs-types/cosmos/base/abci/v1beta1/abci'
import { Tx } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { Any } from 'cosmjs-types/google/protobuf/any'
import { ReactNode } from 'react'

import { CosmAppChainInfo } from '~lib/network/cosm'
import { TokenInfo } from '~lib/services/datasource/cosmostation'

import { TransactionType } from '..'
import {
  msgAcknowledgement,
  msgRecvPacket,
  msgTimeout,
  msgTimeoutOnClose,
  msgTransfer
} from './ibc'
import { msgSendTx } from './sdk'

export interface CosmTxInfo {
  success?: boolean
  type: TransactionType
  name?: string
  from?: string
  to?: string
  denom?: string
  amount?: string
}

export interface CosmMsg {
  type: string
  typeUrl: string
  events: StringEvent[]
  node?: ReactNode
  msg: Any
}

type Attribute = [string, string]

export function parseCosmTx(
  tx: Tx,
  txResponseOrLogs: TxResponse | ABCIMessageLog[] | undefined,
  chain: CosmAppChainInfo,
  account: string,
  tokenInfos?: Map<string, TokenInfo>
): CosmTxInfo & {
  msgs: CosmMsg[]
} {
  let txInfo: CosmTxInfo | undefined

  if ((txResponseOrLogs as TxResponse).logs) {
    console.log(
      (txResponseOrLogs as TxResponse).txhash,
      tx.body?.messages.length
    )
  }

  const msgs =
    tx.body?.messages.map((msg, i) => {
      const cosmMsg = {
        typeUrl: msg.typeUrl as any,
        msg
      } as CosmMsg

      let info: CosmTxInfo | undefined
      if (txResponseOrLogs) {
        cosmMsg.events = (
          (txResponseOrLogs as TxResponse).logs
            ? (txResponseOrLogs as TxResponse).logs
            : (txResponseOrLogs as ABCIMessageLog[])
        )[i].events

        const parse = cosmMsgDescriptions[msg.typeUrl]
        const parsed = parse
          ? parse(cosmMsg, chain, account, tokenInfos)
          : undefined
        info = parsed?.info
        cosmMsg.node = parsed?.node
      } else {
        cosmMsg.events = []
      }

      if (info && !txInfo && (info.from === account || info.to === account)) {
        txInfo = info
      }

      cosmMsg.type = info?.name || msg.typeUrl.split('.').pop() || 'Unknown'

      return cosmMsg
    }) || []

  return {
    success:
      txResponseOrLogs === undefined ||
      (txResponseOrLogs as TxResponse).code === 0 ||
      Array.isArray(txResponseOrLogs as ABCIMessageLog[])
        ? txInfo
          ? txInfo.success
          : true
        : false,
    type: txInfo?.type || TransactionType.CallContract,
    name: txInfo?.name || msgs[0].type,
    from: txInfo?.from,
    to: txInfo?.to,
    denom: txInfo?.denom,
    amount: txInfo?.amount,
    msgs
  }
}

const cosmMsgDescriptions: {
  [typeUrl: string]: (
    msg: CosmMsg,
    chain: CosmAppChainInfo,
    account: string,
    tokenInfos?: Map<string, TokenInfo>
  ) => { info: CosmTxInfo; node: ReactNode }
} = {
  '/cosmos.bank.v1beta1.MsgSend': msgSendTx,
  '/ibc.applications.transfer.v1.MsgTransfer': msgTransfer,
  '/ibc.core.channel.v1.MsgRecvPacket': msgRecvPacket,
  '/ibc.core.channel.v1.MsgAcknowledgement': msgAcknowledgement,
  '/ibc.core.channel.v1.MsgTimeout': msgTimeout,
  '/ibc.core.channel.v1.MsgTimeoutOnClose': msgTimeoutOnClose
}
