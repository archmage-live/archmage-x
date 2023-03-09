import { shallowCopy } from '@ethersproject/properties'
import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback } from 'react'
import { useAsync } from 'react-use'

import { ENV } from '~lib/env'
import { NetworkKind } from '~lib/network'
import { SERVICE_WORKER_CLIENT, SERVICE_WORKER_SERVER } from '~lib/rpc'
import {
  ChainId,
  IChainAccount,
  INetwork,
  IToken,
  ITokenList,
  TokenVisibility
} from '~lib/schema'
import { getNetworkInfo } from '~lib/services/network'
import { BaseTokenService } from '~lib/services/token/base'
import { Synchronizer } from '~lib/utils/synchronizer'

import { COSM_TOKEN_SERVICE } from './cosm'
import {
  EVM_TOKEN_SERVICE,
  formatEvmTokenIdentifier,
  getEvmTokenBrief,
  getEvmTokenListBrief
} from './evm'

export interface Amount {
  symbol: string
  decimals: number
  amount: string // number
  amountParticle: string // number
}

export interface TokenBrief {
  name: string
  balance: Amount
  iconUrl?: string
}

export interface TokenListBrief {
  name: string
  desc: string
  url: string
  iconUrl?: string
  tokenCount: number
  enabled: boolean
}

export function getTokenBrief(token: IToken): TokenBrief {
  switch (token.networkKind) {
    case NetworkKind.EVM:
      return getEvmTokenBrief(token)
    default:
      throw new Error('unknown token')
  }
}

export interface NativeToken {
  network: INetwork
  balance: Amount
  iconUrl?: string
}

export function getNativeTokenBrief({
  network,
  balance,
  iconUrl
}: NativeToken): TokenBrief {
  const info = getNetworkInfo(network)
  return {
    name: info.currencyName,
    balance,
    iconUrl
  } as TokenBrief
}

export function getTokenListBrief(
  tokenList: ITokenList,
  chainId: ChainId
): TokenListBrief {
  switch (tokenList.networkKind) {
    case NetworkKind.EVM:
      return getEvmTokenListBrief(tokenList, chainId)
    default:
      throw new Error('unknown token')
  }
}

export function formatTokenIdentifier(networkKind: NetworkKind, token: string) {
  switch (networkKind) {
    case NetworkKind.EVM:
      return formatEvmTokenIdentifier(token)
    default:
      throw new Error('unknown token')
  }
}

export type SearchedToken = {
  token: IToken
  tokenList?: ITokenList
  existing: boolean
}

interface ITokenService {
  getTokenLists(networkKind: NetworkKind): Promise<ITokenList[]>

  getTokenList(
    networkKind: NetworkKind,
    url: string
  ): Promise<ITokenList | undefined>

  enableTokenList(id: number, enabled: boolean): Promise<void>

  addTokenList(tokenList: ITokenList): Promise<ITokenList>

  updateTokenList(tokenList: ITokenList, network: INetwork): Promise<void>

  deleteTokenList(id: number): Promise<void>

  getTokenCount(account: IChainAccount): Promise<number>

  getTokens(account: IChainAccount): Promise<IToken[]>

  getToken(
    id: number | { account: IChainAccount; token: string }
  ): Promise<IToken | undefined>

  addToken(
    token: IToken | { account: IChainAccount; token: string; info: any }
  ): Promise<IToken>

  setTokenVisibility(id: number, visible: TokenVisibility): Promise<void>

  fetchTokenList(
    networkKind: NetworkKind,
    url: string
  ): Promise<ITokenList | undefined>

  searchTokenFromTokenLists(
    account: IChainAccount,
    token: string
  ): Promise<{ tokenList: ITokenList; token: IToken } | undefined>

  searchToken(
    account: IChainAccount,
    token: string
  ): Promise<SearchedToken | undefined>

  fetchTokens(account: IChainAccount): Promise<void>
}

// @ts-ignore
class TokenServicePartial extends BaseTokenService implements ITokenService {}

export class TokenService extends TokenServicePartial {
  private synchronizer = new Synchronizer()

  static async init() {
    if (ENV.inServiceWorker) {
      await EVM_TOKEN_SERVICE.init()
      await COSM_TOKEN_SERVICE.init()
    }
  }

  async updateTokenList(
    tokenList: ITokenList,
    network: INetwork
  ): Promise<void> {
    const waitKey = `updateTokenList-${network.id}-${tokenList.id}`
    const { promise, resolve } = this.synchronizer.get(waitKey)
    if (promise) {
      return promise
    }

    try {
      switch (network.kind) {
        case NetworkKind.EVM:
          // Nothing
          break
        case NetworkKind.COSM:
          await COSM_TOKEN_SERVICE.updateTokenList(tokenList, network)
          break
      }
    } catch (err) {
      console.error(
        `update token list ${tokenList.id} for network ${network.id}: ${err}`
      )
    }

    resolve()
  }

  async fetchTokenList(
    networkKind: NetworkKind,
    url: string
  ): Promise<ITokenList | undefined> {
    const existing = await this.getTokenList(networkKind, url)
    if (existing) {
      return existing
    }

    const waitKey = `${networkKind}-${url}`
    const { promise, resolve } = this.synchronizer.get(waitKey)
    if (promise) {
      return promise
    }

    let tokenList
    switch (networkKind) {
      case NetworkKind.EVM:
        tokenList = await EVM_TOKEN_SERVICE.fetchTokenList(url)
        break
      case NetworkKind.COSM:
        tokenList = await COSM_TOKEN_SERVICE.fetchTokenList(url)
        break
    }

    resolve(tokenList ? shallowCopy(tokenList) : undefined)
    return tokenList
  }

  async searchTokenFromTokenLists(
    account: IChainAccount,
    token: string
  ): Promise<{ tokenList: ITokenList; token: IToken } | undefined> {
    switch (account.networkKind) {
      case NetworkKind.EVM:
        return EVM_TOKEN_SERVICE.searchTokenFromTokenLists(account, token)
      case NetworkKind.COSM:
        return COSM_TOKEN_SERVICE.searchTokenFromTokenLists(account, token)
    }
    return undefined
  }

  async searchToken(
    account: IChainAccount,
    token: string
  ): Promise<SearchedToken | undefined> {
    if (!account.address) {
      return
    }

    try {
      token = formatTokenIdentifier(account.networkKind, token)
    } catch (err) {
      console.error(`search token ${token}: ${err}`)
      return undefined
    }

    const existingFromStore = await this.getToken({ account, token })
    const existingFromTokenLists = await this.searchTokenFromTokenLists(
      account,
      token
    )
    if (existingFromStore || existingFromTokenLists) {
      return {
        token: existingFromStore || existingFromTokenLists!.token,
        tokenList: existingFromTokenLists?.tokenList,
        existing: !!existingFromStore
      }
    }

    const waitKey = `${account.networkKind}-${account.chainId}-${account.address}-${token}`
    const { promise, resolve } = this.synchronizer.get(waitKey)
    if (promise) {
      return promise
    }

    let foundToken
    try {
      switch (account.networkKind) {
        case NetworkKind.EVM:
          foundToken = await EVM_TOKEN_SERVICE.searchToken(account, token)
          break
        case NetworkKind.COSM:
          foundToken = await COSM_TOKEN_SERVICE.searchToken(account, token)
          break
      }
    } catch (err) {
      console.error(`search token ${token}: ${err}`)
    }

    const result = foundToken && {
      token: foundToken,
      existing: false
    }
    resolve(result ? shallowCopy(result) : undefined)
    return result
  }

  async fetchTokens(account: IChainAccount) {
    if (!account.address) {
      return
    }

    const waitKey = `${account.networkKind}-${account.chainId}-${account.address}`
    const { promise, resolve } = this.synchronizer.get(waitKey)
    if (promise) {
      return promise
    }

    switch (account.networkKind) {
      case NetworkKind.EVM:
        await EVM_TOKEN_SERVICE.fetchTokens(account)
        break
      case NetworkKind.COSM:
        await COSM_TOKEN_SERVICE.fetchTokens(account)
        break
    }

    resolve()
  }
}

function createTokenService(): ITokenService {
  const serviceName = 'tokenService'
  let service
  if (ENV.inServiceWorker) {
    service = new TokenService()
    SERVICE_WORKER_SERVER.registerService(serviceName, service)
  } else {
    service = SERVICE_WORKER_CLIENT.service<ITokenService>(
      serviceName,
      // @ts-ignore
      new TokenServicePartial()
    )
  }
  return service
}

export const TOKEN_SERVICE = createTokenService()

export function useTokenLists(networkKind?: NetworkKind) {
  return useLiveQuery(() => {
    if (networkKind === undefined) {
      return
    }
    return TOKEN_SERVICE.getTokenLists(networkKind)
  }, [networkKind])
}

export function useTokens(account?: IChainAccount): {
  tokens: IToken[] | undefined
  fetchTokens: () => Promise<void>
} {
  const fetchTokens = useCallback(async () => {
    if (!account) return
    await TOKEN_SERVICE.fetchTokens(account)
  }, [account])

  useAsync(fetchTokens, [fetchTokens])

  const tokens = useLiveQuery(async () => {
    if (!account) return
    return TOKEN_SERVICE.getTokens(account)
  }, [account])

  return { tokens, fetchTokens }
}

export function useTokenById(id?: number) {
  return useLiveQuery(async () => {
    if (id === undefined) return
    return TOKEN_SERVICE.getToken(id)
  }, [id])
}

export function useToken(account?: IChainAccount, token?: string) {
  return useLiveQuery(async () => {
    if (!account || !token) return
    return TOKEN_SERVICE.getToken({ account, token })
  }, [account, token])
}
