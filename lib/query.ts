import { QueryFunctionContext, QueryKey } from '@tanstack/query-core'
import { useQuery } from '@tanstack/react-query'
import assert from 'assert'

export enum QueryService {
  PROVIDER = 'provider',
  CRYPTO_COMPARE = 'cryptoCompare',
  COIN_GECKO = 'coinGecko',
  FOUR_BYTE = 'fourByte',
  CHAIN_LIST = 'chainList',
  ETH_BALANCE_CHECKER = 'ethBalanceChecker'
}

const QUERY_SERVICES = new Map<string, any>()

export function registerQueryService(name: string, service: any) {
  if (QUERY_SERVICES.has(name)) {
    throw new Error(`QueryFn '${name}' exists`)
  }
  QUERY_SERVICES.set(name, service)
}

export function useDirectedQuery<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(queryKey: TQueryKey) {
  assert(queryKey.length)
  const service = QUERY_SERVICES.get(queryKey[0] as string)
  const queryFn = ({
    queryKey
  }: QueryFunctionContext<TQueryKey>): Promise<any> => {
    const [_, method, ...params] = queryKey
    return service[method as string](...params)
  }
  return useQuery(queryKey, queryFn)
}
