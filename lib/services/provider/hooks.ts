import { AddressZero } from '@ethersproject/constants'
import { useQuery } from '@tanstack/react-query'
import assert from 'assert'
import Decimal from 'decimal.js'
import { useLiveQuery } from 'dexie-react-hooks'
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
import { AptosAddressZero } from '~lib/services/network/aptosService'
import { getBtcFeeBrief } from '~lib/services/provider/btc/fee'
import { getEvmGasFeeBrief } from '~lib/services/provider/evm/gasFee'
import { Provider, getProvider } from '~lib/services/provider/provider'
import { Amount } from '~lib/services/token'
import { getTransactionService } from '~lib/services/transaction'

export function addressZero(network: INetwork): string {
  switch (network.kind) {
    case NetworkKind.EVM:
      return AddressZero
    case NetworkKind.APTOS:
      return AptosAddressZero
  }
  throw new Error(`provider for network ${network.kind} is not implemented`)
}

export function getGasFeeBrief(network: INetwork, gasFee: any): string {
  switch (network.kind) {
    case NetworkKind.BTC:
      return getBtcFeeBrief(gasFee).toString()
    case NetworkKind.EVM:
      return getEvmGasFeeBrief(gasFee)
    case NetworkKind.APTOS:
      return gasFee
  }
  throw new Error(`provider for network ${network.kind} is not implemented`)
}

export function useNetworkStatus(network?: INetwork, retryInterval?: number) {
  const provider = useProvider(network)

  const { value, loading, retry } = useAsyncRetry(async () => {
    return provider?.isOk()
  }, [provider])

  useInterval(retry, retryInterval && !loading ? retryInterval : null)

  return value
}

export function useIsContract(network?: INetwork, address?: string) {
  const provider = useProvider(network)

  const { value } = useAsync(async () => {
    if (!provider) {
      return
    }
    if (!address) {
      return false
    }
    return provider.isContract(address)
  }, [address, provider])

  return value
}

export function useBalance(
  network?: INetwork,
  account?: IChainAccount | string
): Amount | undefined {
  const address = typeof account === 'object' ? account.address : account

  const { data } = useQuery(
    [QueryService.PROVIDER, network?.id, address, 'getBalance'],
    async () => {
      if (!network || !address) {
        return null
      }
      return (await getProvider(network)).getBalance(account!)
    }
  )

  const balance = useCache3(
    CacheCategory.PROVIDER,
    network?.id,
    'balance',
    address,
    data
  )

  return useMemo(() => {
    if (!network) return undefined

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
    } as Amount
  }, [balance, network])
}

export function useBalances(
  network?: INetwork,
  accounts?: IChainAccount[]
): Map<number, Amount> | undefined {
  const addresses = useMemo(
    () =>
      (accounts || [])
        .map((acc) => acc.address)
        .filter((acc) => !!acc) as string[],
    [accounts]
  )

  const getBalances = useCallback(async () => {
    if (!network || !accounts || !addresses.length) {
      return new Map<string, string>()
    }
    const balances = await (await getProvider(network)).getBalances(accounts)
    return new Map(
      accounts
        .map((acc, i) => [acc.address as string, balances[i]])
        .filter(([addr, balance]) => addr && balance) as [string, string][]
    )
  }, [network, accounts, addresses])

  const { data: balanceByAddr } = useQuery(
    [QueryService.ETH_BALANCE_CHECKER, network?.id, addresses],
    getBalances
  )

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
      } as Amount)
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
  account?: IChainAccount,
  retryInterval?: number
) {
  const provider = useProvider(network)

  const {
    value: [_gasPrice, gasPriceBrief] = [],
    retry,
    loading
  } = useAsyncRetry(async () => {
    if (!network || !account || !provider) {
      return
    }
    const gasPrice = await provider.estimateGasPrice(account)
    const gasPriceBrief = getGasFeeBrief(network, gasPrice)
    return [gasPrice, gasPriceBrief]
  }, [network, provider])

  useInterval(retry, retryInterval && !loading ? retryInterval : null)

  const [gasPrice, setGasPrice] = useState<any>()
  useEffect(() => {
    if (_gasPrice === undefined) {
      return
    }
    setGasPrice(_gasPrice)
  }, [_gasPrice])

  return { gasPrice, gasPriceBrief }
}

export function useEstimateGas(
  network?: INetwork,
  account?: IChainAccount,
  tx?: any
) {
  const provider = useProvider(network)

  const { value } = useAsync(async () => {
    if (!network || !account?.address || !tx || !provider) {
      return
    }

    try {
      return await provider.estimateGas(account, tx)
    } catch (err) {
      console.error('useEstimateGas:', err)
    }
  }, [network, account, tx, provider])

  return value
}

export function useEstimateGasFee(
  network?: INetwork,
  account?: IChainAccount,
  tx?: any,
  retryInterval?: number
) {
  const { gasPriceBrief } = useEstimateGasPrice(network, account, retryInterval)
  const gas = useEstimateGas(network, account, tx)

  return useMemo(() => {
    if (!gasPriceBrief || !gas) {
      return
    }

    const gasFee = new Decimal(gasPriceBrief).mul(gas).toString()
    console.log('gasPrice:', gasPriceBrief, 'gas:', gas, 'gasFee:', gasFee)
    return gasFee
  }, [gasPriceBrief, gas])
}

export async function getNonce(
  provider: Provider,
  account: IChainAccount,
  tag?: string | number
) {
  assert(account.address)
  let nextNonce = await Promise.resolve(provider.getNextNonce(account, tag))

  const pendingTxs = await getTransactionService(
    account.networkKind
  ).getPendingTxs(account, undefined, false)
  for (const { nonce } of pendingTxs) {
    if (nonce === nextNonce) {
      ++nextNonce
    }
  }

  return nextNonce
}

export function useNonce(
  network?: INetwork,
  account?: IChainAccount,
  tag?: string | number
) {
  const provider = useProvider(network)

  return useLiveQuery(async () => {
    if (!account?.address || !provider) {
      return
    }

    return getNonce(provider, account, tag)
  }, [account, tag, provider])
}
