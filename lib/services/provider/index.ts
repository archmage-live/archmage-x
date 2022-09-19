import { useQueries, useQuery } from '@tanstack/react-query'
import Decimal from 'decimal.js'
import { useCallback, useMemo } from 'react'

import { NetworkKind } from '~lib/network'
import { QueryService } from '~lib/query'
import { IChainAccount, INetwork } from '~lib/schema'
import { getNetworkInfo } from '~lib/services/network'
import { Balance } from '~lib/services/token'

import { EvmProviderAdaptor } from './evm'
import { ProviderAdaptor } from './types'

export async function getProvider(network: INetwork): Promise<ProviderAdaptor> {
  switch (network.kind) {
    case NetworkKind.EVM:
      return await EvmProviderAdaptor.from(network)
    case NetworkKind.COSM:
    case NetworkKind.SOL:
  }
  throw new Error(`provider for network ${network.kind} is not implemented`)
}

export function useBalance(
  network?: INetwork,
  account?: IChainAccount
): Balance | undefined {
  // TODO: cache
  const { data: balance } = useQuery(
    [QueryService.PROVIDER, network, account?.address, 'getBalance'],
    async () =>
      network &&
      account?.address &&
      (await getProvider(network)).getBalance(account.address)
  )

  return useMemo(() => {
    if (!network || !account) return undefined

    const info = getNetworkInfo(network)
    return {
      symbol: info.currencySymbol,
      amount: balance
        ? new Decimal(balance)
            .div(new Decimal(10).pow(info.decimals))
            .toString()
        : '0',
      amountParticle: balance || '0'
    } as Balance
  }, [balance, network, account])
}

export function useBalances(
  network?: INetwork,
  accounts?: IChainAccount[]
): Balance[] | undefined {
  const addresses = useMemo(
    () => (accounts || []).map((acc) => acc.address),
    [accounts]
  )

  const getBalances = useCallback(async () => {
    if (!network || !addresses.length) {
      return
    }
    const balances = await (
      await getProvider(network)
    ).getBalances(addresses.filter((addr) => addr) as string[])
    // console.log(addresses, balances)
    if (!balances) {
      return null
    }
    const result = []
    let i = 0
    for (const addr of addresses) {
      if (!addr) {
        result.push(undefined)
      } else {
        result.push(balances[i])
        ++i
      }
    }
    return result
  }, [network, addresses])

  // TODO: cache
  const { data: balances1, error: error } = useQuery(
    [QueryService.ETH_BALANCE_CHECKER, network, addresses],
    getBalances
  )

  if (error) {
    console.error(error)
  }

  const getBalance = useCallback(
    async (address: string) =>
      network && (await getProvider(network)).getBalance(address),
    [network]
  )

  // TODO: cache
  const queriesResult = useQueries({
    queries: addresses.map((address) => {
      return {
        queryKey: [QueryService.PROVIDER, network, address, 'getBalance'],
        queryFn: async () => address && (await getBalance(address)),
        enabled: balances1 === null
      }
    })
  })

  return useMemo(() => {
    if (!network || !addresses.length) {
      return undefined
    }

    const info = getNetworkInfo(network)

    const balances2 = queriesResult.map(({ data, error }) => {
      if (error) {
        console.error(error)
      }
      return data
    })
    const balances = balances1 || balances2

    return balances.map((balance) => {
      return {
        symbol: info.currencySymbol,
        amount: balance
          ? new Decimal(balance)
              .div(new Decimal(10).pow(info.decimals))
              .toString()
          : '0',
        amountParticle: balance || '0'
      } as Balance
    })
  }, [network, addresses, balances1, queriesResult])
}
