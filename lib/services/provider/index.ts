import { AddressZero } from '@ethersproject/constants'
import { useQueries, useQuery } from '@tanstack/react-query'
import Decimal from 'decimal.js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAsync, useAsyncRetry, useInterval } from 'react-use'

import { NetworkKind } from '~lib/network'
import { QueryService } from '~lib/query'
import { IChainAccount, INetwork } from '~lib/schema'
import {
  CacheCategory,
  useCache3,
  useCachesByKeys3
} from '~lib/services/cacheService'
import { getNetworkInfo } from '~lib/services/network'
import { Balance } from '~lib/services/token'
import { checkAddress } from '~lib/wallet'

import { EvmProviderAdaptor } from './evm'
import { getEvmGasFeeBrief } from './evm/gasFee'
import { ProviderAdaptor } from './types'

export * from './types'

export async function getProvider(network: INetwork): Promise<ProviderAdaptor> {
  switch (network.kind) {
    case NetworkKind.EVM:
      return await EvmProviderAdaptor.from(network)
    case NetworkKind.COSM:
    case NetworkKind.SOL:
  }
  throw new Error(`provider for network ${network.kind} is not implemented`)
}

export function addressZero(network: INetwork): string {
  switch (network.kind) {
    case NetworkKind.EVM:
      return AddressZero
  }
  throw new Error(`provider for network ${network.kind} is not implemented`)
}

export function getGasFeeBrief(network: INetwork, gasFee: any): string {
  switch (network.kind) {
    case NetworkKind.EVM:
      return getEvmGasFeeBrief(gasFee)
  }
  throw new Error(`provider for network ${network.kind} is not implemented`)
}

export function useIsContract(network?: INetwork, address?: string) {
  const provider = useProvider(network)

  const { value } = useAsync(async () => {
    if (!address || !provider) {
      return
    }
    return provider.isContract(address)
  }, [address, provider])

  return value
}

export function useBalance(
  network?: INetwork,
  account?: IChainAccount
): Balance | undefined {
  const { data } = useQuery(
    [QueryService.PROVIDER, network?.id, account?.address, 'getBalance'],
    async () =>
      network &&
      account?.address &&
      (await getProvider(network)).getBalance(account.address)
  )

  const balance = useCache3(
    CacheCategory.PROVIDER,
    network?.id,
    'balance',
    account?.address,
    data
  )

  return useMemo(() => {
    if (!network || !account) return undefined

    const info = getNetworkInfo(network)
    return {
      symbol: info.currencySymbol,
      decimals: info.decimals,
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
): Map<number, Balance> | undefined {
  const addresses = useMemo(
    () =>
      (accounts || [])
        .map((acc) => acc.address)
        .filter((acc) => !!acc) as string[],
    [accounts]
  )

  const getBalances = useCallback(async () => {
    if (!network || !addresses.length) {
      return
    }
    const balances = await (await getProvider(network)).getBalances(addresses)
    // console.log(addresses, balances)
    if (!balances) {
      return null
    }
    return new Map(addresses.map((addr, i) => [addr, balances[i]]))
  }, [network, addresses])

  const { data: balances1, error: error } = useQuery(
    [QueryService.ETH_BALANCE_CHECKER, network?.id, addresses],
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

  const balances2 = useQueries({
    queries: addresses.map((address) => {
      return {
        queryKey: [QueryService.PROVIDER, network?.id, address, 'getBalance'],
        queryFn: async () => await getBalance(address),
        enabled: balances1 === null
      }
    })
  })

  const balanceByAddr = useMemo(() => {
    if (balances1) {
      return balances1
    }
    return new Map(
      addresses.map((addr, i) => {
        const { data, error } = balances2[i]
        if (error) {
          console.error(error)
        }
        return [addr, data]
      })
    )
  }, [addresses, balances1, balances2])

  const balanceMap = useCachesByKeys3(
    CacheCategory.PROVIDER,
    network?.id,
    'balance',
    addresses,
    balanceByAddr
  )

  return useMemo(() => {
    if (!network || !accounts || !balanceMap) {
      return undefined
    }
    const info = getNetworkInfo(network)

    const result = new Map()
    for (const account of accounts) {
      if (!account.address) continue

      const balance = balanceMap.get(account.address)

      result.set(account.id, {
        symbol: info.currencySymbol,
        decimals: info.decimals,
        amount: balance
          ? new Decimal(balance)
              .div(new Decimal(10).pow(info.decimals))
              .toString()
          : '0',
        amountParticle: balance || '0'
      } as Balance)
    }

    return result
  }, [network, accounts, balanceMap])
}

export function useProvider(network?: INetwork) {
  const { value } = useAsync(async () => {
    if (!network) {
      return
    }
    return getProvider(network)
  }, [network])

  return value
}

export function useEstimateGasPrice(
  network?: INetwork,
  retryInterval?: number
) {
  const provider = useProvider(network)

  const { value, retry, loading } = useAsyncRetry(async () => {
    if (!provider) {
      return
    }
    return provider.estimateGasPrice()
  }, [provider])

  useInterval(retry, retryInterval && !loading ? retryInterval : null)

  const [gasPrice, setGasPrice] = useState<any>()
  useEffect(() => {
    if (value === undefined) {
      return
    }
    setGasPrice(value)
  }, [value])

  return gasPrice
}

export function useEstimateGas(
  network?: INetwork,
  account?: IChainAccount,
  to?: string
) {
  const provider = useProvider(network)

  const { value } = useAsync(async () => {
    if (!network || !account?.address || !provider) {
      return
    }

    let toAddr = to ? to : addressZero(network)

    if (!checkAddress(network.kind, toAddr)) {
      return
    }

    return provider.estimateSendGas(account, toAddr)
  }, [network, account, to, provider])

  return value
}

export function useEstimateGasFee(
  network?: INetwork,
  account?: IChainAccount,
  retryInterval?: number,
  to?: string
) {
  const gasPrice = useEstimateGasPrice(network, retryInterval)
  const gas = useEstimateGas(network, account, to)

  return useMemo(() => {
    if (!network || !gasPrice || !gas) {
      return
    }

    const gasFee = new Decimal(getGasFeeBrief(network, gasPrice))
      .mul(gas)
      .toString()
    console.log('gasPrice:', gasPrice, 'gas:', gas, 'gasFee:', gasFee)
    return gasFee
  }, [network, gasPrice, gas])
}
