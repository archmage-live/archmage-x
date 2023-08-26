/**
 * Forked from
 * https://github.com/argentlabs/argent-x/blob/develop/packages/extension/src/shared/transactionSimulation/findTransferAndApproval.ts
 */
import Decimal from 'decimal.js'
import { useMemo } from 'react'
import { useAsyncRetry, useInterval } from 'react-use'
import {
  Contract,
  FunctionInvocation,
  hash,
  shortString,
  uint256
} from 'starknet'

import erc20Abi from '~lib/network/starknet/abi/ERC20.json'
import { INetwork } from '~lib/schema'
import { getStarknetClient } from '~lib/services/provider/starknet/client'
import { Amount } from '~lib/services/token'
import { checkAddress } from '~lib/wallet'

export interface TransactionSimulationApproval {
  tokenAddress: string
  owner: string
  spender: string
  value?: string
  tokenId?: string
  details?: TokenDetails
}

export interface TransactionSimulationTransfer {
  tokenAddress: string
  from: string
  to: string
  value?: string
  tokenId?: string
  details?: TokenDetails
}

export interface TokenDetails {
  decimals: string | null
  symbol: string
  name: string
  tokenURI: string | null
  tokenType: 'erc20' | 'erc721' | 'erc1155'
  usdValue: string | null
}

export type TransferEvent = Omit<TransactionSimulationTransfer, 'details'>
export type ApprovalEvent = Omit<TransactionSimulationApproval, 'details'>

export const EventsBySelector = {
  Transfer: hash.getSelectorFromName('Transfer'), // 0x99cd8bde557814842a3121e8ddfd433a539b8c9f14bf31ebf108d12e6196e9
  Approval: hash.getSelectorFromName('Approval') // 0x134692b230b9e1ffa39098904722134159652b09c5bc41d88d6698779d228ff
}

export const getStarknetEvents = (
  internalCalls: FunctionInvocation | FunctionInvocation[],
  approvals: ApprovalEvent[] = [],
  transfers: TransferEvent[] = []
) => {
  for (const internalCall of Array.isArray(internalCalls)
    ? internalCalls
    : [internalCalls]) {
    const { events, internal_calls } = internalCall
    for (const event of events) {
      for (const key of event.keys) {
        if (key === EventsBySelector.Approval) {
          approvals.push({
            tokenAddress: internalCall.contract_address,
            owner: event.data[0],
            spender: event.data[1],
            value: uint256
              .uint256ToBN({ low: event.data[2], high: event.data[3] })
              .toString()
          })
        }
        if (key === EventsBySelector.Transfer) {
          transfers.push({
            tokenAddress: internalCall.contract_address,
            from: event.data[0],
            to: event.data[1],
            value: uint256
              .uint256ToBN({ low: event.data[2], high: event.data[3] })
              .toString()
          })
        }
      }
    }

    if (internal_calls) {
      getStarknetEvents(internal_calls, approvals, transfers)
    }
  }

  return { approvals, transfers }
}

export async function getStarknetTokenTransfers(
  network: INetwork,
  transfers: TransferEvent[]
) {
  const client = await getStarknetClient(network)

  // account -> tokenAddress -> Amount
  const tokenEvents = new Map<string, Map<string, Amount>>()
  const transferEvents = [] as ({
    tokenAddress: string
    from: string
    to: string
  } & Amount)[]

  for (const transfer of transfers) {
    const tokenAddress = checkAddress(network.kind, transfer.tokenAddress)
    const from = checkAddress(network.kind, transfer.from)
    const to = checkAddress(network.kind, transfer.to)
    if (!tokenAddress || !from || !to) {
      continue
    }

    let fromEvents = tokenEvents.get(from)
    if (!fromEvents) {
      fromEvents = new Map()
      tokenEvents.set(from, fromEvents)
    }
    let toEvents = tokenEvents.get(to)
    if (!toEvents) {
      toEvents = new Map()
      tokenEvents.set(to, toEvents)
    }

    const contract = new Contract(erc20Abi, tokenAddress, client)

    let symbol, decimals
    try {
      const s = await contract.symbol()
      const d = await contract.decimals()
      if (!contract.isCairo1()) {
        symbol = shortString.decodeShortString(s.symbol)
        decimals = Number(d.decimals)
      } else {
        symbol = shortString.decodeShortString(s)
        decimals = Number(d)
      }
    } catch (err) {
      console.error(err)
      continue
    }

    let fromAmt = fromEvents.get(tokenAddress)
    if (!fromAmt) {
      fromAmt = {
        symbol,
        decimals,
        amount: '0',
        amountParticle: '0'
      }
      fromEvents.set(tokenAddress, fromAmt)
    }
    let toAmt = toEvents.get(tokenAddress)
    if (!toAmt) {
      toAmt = {
        symbol,
        decimals,
        amount: '0',
        amountParticle: '0'
      }
      toEvents.set(tokenAddress, toAmt)
    }

    fromAmt.amountParticle = new Decimal(fromAmt.amountParticle)
      .minus(transfer.value || 0)
      .toString()
    fromAmt.amount = new Decimal(fromAmt.amountParticle)
      .div(new Decimal(10).pow(decimals))
      .toString()

    toAmt.amountParticle = new Decimal(toAmt.amountParticle)
      .plus(transfer.value || 0)
      .toString()
    toAmt.amount = new Decimal(toAmt.amountParticle)
      .div(new Decimal(10).pow(decimals))
      .toString()

    transferEvents.push({
      tokenAddress,
      from,
      to,
      symbol,
      decimals,
      amount: new Decimal(transfer.value || '0')
        .div(new Decimal(10).pow(decimals))
        .toString(),
      amountParticle: transfer.value || '0'
    })
  }

  return [tokenEvents, transferEvents] as [
    typeof tokenEvents,
    typeof transferEvents
  ]
}

export function useStarknetTxEvents(
  internalCalls?: FunctionInvocation | FunctionInvocation[]
) {
  return useMemo(
    () =>
      internalCalls
        ? getStarknetEvents(internalCalls)
        : ({} as Partial<ReturnType<typeof getStarknetEvents>>),
    [internalCalls]
  )
}

export function useStarknetTokenTransfers(
  network?: INetwork,
  transfers?: TransferEvent[]
) {
  const { value, loading, error, retry } = useAsyncRetry(async () => {
    if (!network || !transfers) {
      return
    }

    return await getStarknetTokenTransfers(network, transfers)
  }, [network, transfers])

  useInterval(retry, !loading && error ? 5000 : null)

  return value
}
