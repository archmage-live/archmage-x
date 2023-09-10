import { HStack, Text } from '@chakra-ui/react'
import { ReactNode } from 'react'

import { FromTo } from '~components/FromTo'
import { CosmAppChainInfo } from '~lib/network/cosm'
import { Coin } from '~lib/network/cosm/coin'
import { TokenInfo } from '~lib/services/datasource/cosmostation'
import { TransactionType } from '~lib/services/transaction'

import { CosmMsg, CosmTxInfo } from './'
import { extractEventAttributes, formatCosmCoin } from './util'

export function msgSendTx(
  msg: CosmMsg,
  chain: CosmAppChainInfo,
  account: string,
  tokenInfos?: Map<string, TokenInfo>
): { info: CosmTxInfo; node: ReactNode } {
  const attrs = extractEventAttributes(msg.events, 'transfer')
  const amount = attrs?.get('amount')
  const coin = amount ? Coin.fromString(amount).toProto() : undefined
  const sender = attrs?.get('sender')
  const recipient = attrs?.get('recipient')

  const type =
    account === recipient ? TransactionType.Receive : TransactionType.Send

  const info = {
    type,
    name: type === TransactionType.Send ? 'Send' : 'Receive',
    from: sender,
    to: recipient,
    denom: coin?.denom,
    amount: coin?.amount
  }

  const node = (
    <>
      <HStack justify="space-between">
        <Text>From</Text>
        <Text>To</Text>
      </HStack>

      <FromTo
        from={sender}
        to={recipient}
        leadingChars={chain.bech32Config.bech32PrefixAccAddr}
      />

      <HStack justify="space-between">
        <Text>Amount</Text>
        <Text>{formatCosmCoin(amount, tokenInfos)}</Text>
      </HStack>
    </>
  )

  return { info, node }
}
