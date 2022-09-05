import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'

import { ENV } from '~lib/env'
import { NetworkKind } from '~lib/network'
import { SERVICE_WORKER_CLIENT, SERVICE_WORKER_SERVER } from '~lib/rpc'
import { ChainId, IChainAccount, IToken, ITokenList } from '~lib/schema'
import { BaseTokenService } from '~lib/services/token/base'

import {
  EVM_TOKEN_SERVICE,
  getEvmTokenBrief,
  getEvmTokenListBrief
} from './evm'

export interface Balance {
  symbol: string
  amount: string // number
  amountParticle: string // number
}

export interface TokenBrief {
  name: string
  balance: Balance
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

interface ITokenService {
  getTokenLists(networkKind: NetworkKind): Promise<ITokenList[]>

  getTokenList(
    networkKind: NetworkKind,
    url: string
  ): Promise<ITokenList | undefined>

  enableTokenList(id: number, enabled: boolean): Promise<void>

  deleteTokenList(id: number): Promise<void>

  getTokenCount(account: IChainAccount): Promise<number>

  getTokens(account: IChainAccount): Promise<IToken[]>

  getToken(id: number): Promise<IToken | undefined>

  setTokenVisibility(id: number, visible: boolean): Promise<void>

  fetchTokens(account: IChainAccount): Promise<void>
}

// @ts-ignore
class TokenServicePartial extends BaseTokenService implements ITokenService {}

export class TokenService extends TokenServicePartial {
  private waits: Map<string, Promise<void>> = new Map()

  static async init() {
    if (ENV.inServiceWorker) {
      await EVM_TOKEN_SERVICE.init()
    }
  }

  async fetchTokens(account: IChainAccount) {
    if (!account.address) {
      return
    }

    const waitKey = `${account.networkKind}-${account.chainId}-${account.address}`
    const wait = this.waits.get(waitKey)
    if (wait) {
      return wait
    }

    let resolve: any
    this.waits.set(
      waitKey,
      new Promise((r) => {
        resolve = r
      })
    )

    switch (account.networkKind) {
      case NetworkKind.EVM:
        await EVM_TOKEN_SERVICE.fetchTokens(account)
        break
    }

    this.waits.delete(waitKey)
    resolve()
  }
}

function createTokenService() {
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

export function useTokens(account?: IChainAccount): IToken[] | undefined {
  useEffect(() => {
    if (!account) return
    TOKEN_SERVICE.fetchTokens(account)
  }, [account])

  return useLiveQuery(async () => {
    if (!account) return
    return TOKEN_SERVICE.getTokens(account)
  }, [account])
}

export function useToken(id?: number) {
  return useLiveQuery(async () => {
    if (id === undefined) return
    return TOKEN_SERVICE.getToken(id)
  })
}
