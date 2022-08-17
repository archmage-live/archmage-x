import { useQuery } from '@tanstack/react-query'
import Decimal from 'decimal.js'
import { useMemo } from 'react'

import { NetworkKind } from '~lib/network'
import { QueryService } from '~lib/query'
import { INetwork, IWalletInfo } from '~lib/schema'
import { getNetworkInfo } from '~lib/services/network'

import { EvmProviderAdaptor } from './evm'
import { Balance, ProviderAdaptor } from './types'

export function getProvider(network: INetwork): ProviderAdaptor {
  switch (network.kind) {
    case NetworkKind.EVM:
      return new EvmProviderAdaptor(network)
    case NetworkKind.COSM:
    case NetworkKind.SOL:
  }
  throw new Error(`provider for network ${network.kind} is not implemented`)
}

export function useBalance(
  network?: INetwork,
  wallet?: IWalletInfo
): Balance | undefined {
  const { data: balance } = useQuery(
    [QueryService.PROVIDER, network, wallet],
    async () =>
      network && wallet && getProvider(network).getBalance(wallet.address)
  )

  return useMemo(() => {
    if (!network || !wallet) return undefined

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
  }, [balance, network, wallet])
}
