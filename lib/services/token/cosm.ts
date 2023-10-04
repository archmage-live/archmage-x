import { shallowCopy } from '@ethersproject/properties'
import assert from 'assert'
import { Metadata } from 'cosmjs-types/cosmos/bank/v1beta1/bank'
import Decimal from 'decimal.js'

import { DB, getNextField } from '~lib/db'
import { NetworkKind } from '~lib/network'
import { COSM_NETWORKS_PRESET, CosmAppChainInfo } from '~lib/network/cosm'
import { Coin } from '~lib/network/cosm/coin'
import {
  ChainId,
  IChainAccount,
  INetwork,
  IToken,
  ITokenList,
  TokenVisibility
} from '~lib/schema'
import {
  COSMOSTATION_API,
  COSMOSTATION_REPO_URL,
  TokenInfo,
  TokenList
} from '~lib/services/datasource/cosmostation'
import { NETWORK_SERVICE } from '~lib/services/network'
import { getCosmClient } from '~lib/services/provider/cosm/client'

import { SearchedTokenFromTokenLists, TokenBrief, TokenListBrief } from '.'
import { BaseTokenService, getNextTokenSortId } from './base'

export type CosmTokenInfo = {
  info: TokenInfo
  balance: string
}

export function getCosmTokenBrief(token: IToken): TokenBrief {
  const { info, balance } = token.info as CosmTokenInfo
  return {
    name: info.symbol,
    iconUrl: info.image,
    balance: {
      symbol: info.symbol,
      decimals: info.decimals,
      amount: new Decimal(balance)
        .div(new Decimal(10).pow(info.decimals))
        .toString(),
      amountParticle: balance
    }
  }
}

export function getCosmTokenListBrief(
  token: ITokenList,
  chainId: ChainId
): TokenListBrief {
  const info = token.info as Omit<TokenList, 'tokens'>
  return {
    name: info.name,
    desc: info.desc,
    url: info.url,
    iconUrl: info.logoURI,
    tokenCount: token.tokens.reduce(
      (count, token: TokenInfo) => count + (token.chainId === chainId),
      0
    ),
    enabled: token.enabled
  }
}

export class CosmTokenService extends BaseTokenService {
  async init() {
    if (!process.env.PLASMO_PUBLIC_ENABLE_COSMOS) {
      return
    }

    await this._initDefaultTokenLists()

    console.log('initialized cosm tokens')
  }

  private async _initDefaultTokenLists() {
    const defaultTokenListUrls = [COSMOSTATION_REPO_URL]

    return this.initDefaultTokenLists(
      NetworkKind.COSM,
      defaultTokenListUrls,
      async (urls: string[]) => {
        if (!urls.length) {
          return []
        }
        assert(urls[0] === COSMOSTATION_REPO_URL)

        let tokenList: TokenList | undefined
        for (const chain of COSM_NETWORKS_PRESET) {
          const newTokenList = await COSMOSTATION_API.getTokenList(
            chain,
            tokenList
          )
          if (!newTokenList) {
            continue
          }
          tokenList = newTokenList
        }

        return tokenList
          ? [this._makeTokenList(COSMOSTATION_REPO_URL, tokenList)]
          : []
      }
    )
  }

  private _makeTokenList(url: string, tokenList: TokenList, enabled = false) {
    const info = shallowCopy(tokenList) as any
    delete info.tokens

    return {
      networkKind: NetworkKind.COSM,
      url,
      enabled,
      info,
      tokens: tokenList.tokens
    } as ITokenList
  }

  async updateTokenList(
    tokenList: ITokenList,
    network: INetwork
  ): Promise<void> {
    assert(network.kind === NetworkKind.COSM)
    const info = network.info as CosmAppChainInfo

    let list: TokenList = shallowCopy(tokenList.info)
    list.tokens = tokenList.tokens
    const newList = await COSMOSTATION_API.getTokenList(info, list)
    if (!newList) {
      return
    }

    tokenList.info = newList
    tokenList.tokens = newList.tokens
    delete tokenList.info.tokens

    await DB.tokenLists.put(tokenList)
  }

  async fetchTokenList(url: string): Promise<ITokenList | undefined> {
    return undefined
  }

  async searchTokenFromTokenLists(
    account: IChainAccount,
    token: string // denom
  ): Promise<SearchedTokenFromTokenLists | undefined> {
    assert(account.networkKind === NetworkKind.COSM)

    let foundToken: IToken | undefined
    const tokenLists = await this.getTokenLists(account.networkKind)
    const tokenList = tokenLists.find((tokenList) => {
      if (!tokenList.enabled) {
        return
      }
      return (tokenList.tokens as TokenInfo[]).find((info) => {
        if (info.chainId === account.chainId && info.denom === token) {
          foundToken = {
            masterId: account.masterId,
            index: account.index,
            networkKind: account.networkKind,
            chainId: account.chainId,
            address: account.address,
            sortId: 0, // not used
            token,
            visible: TokenVisibility.UNSPECIFIED,
            info: {
              info
            } as CosmTokenInfo
          } as IToken
          return true
        }
      })
    })

    if (!tokenList || !foundToken) return undefined

    const info = foundToken.info as CosmTokenInfo
    try {
      const balances = await this._fetchTokensBalance(account, [info.info])
      info.balance = balances[0][1]
    } catch (e) {
      info.balance = '0'
    }

    return {
      tokenList,
      token: foundToken
    }
  }

  async searchToken(
    account: IChainAccount,
    token: string
  ): Promise<IToken | undefined> {
    assert(account.networkKind === NetworkKind.COSM)
    assert(account.address)

    const network = await NETWORK_SERVICE.getNetwork({
      kind: NetworkKind.COSM,
      chainId: account.chainId
    })
    assert(network)

    const client = await getCosmClient(network)
    const queryClient = client.getQueryClient()

    const coin = Coin.fromProto(await queryClient.bank.supplyOf(token))
    if (!coin.amount.isPositive()) {
      return
    }
    const balance = Coin.fromProto(
      await queryClient.bank.balance(account.address, token)
    )
    let metadata: Metadata | undefined
    let decimals = 0
    try {
      metadata = await queryClient.bank.denomMetadata(token)
      if (metadata) {
        for (const denomUnit of metadata.denomUnits) {
          if (denomUnit.exponent > 0) {
            decimals = denomUnit.exponent
            break
          }
        }
      }
    } catch (err) {
      console.error(`cosm denomMetadata for denom ${token}: ${err}`)
    }

    return {
      masterId: account.masterId,
      index: account.index,
      networkKind: account.networkKind,
      chainId: account.chainId,
      address: account.address,
      sortId: 0, // not used
      token,
      visible: TokenVisibility.UNSPECIFIED,
      info: {
        info: {
          chainId: account.chainId,
          denom: token,
          type: 'native',
          symbol: metadata?.symbol || token,
          decimals,
          description: metadata?.description
        } as TokenInfo,
        balance: balance.amount.toString()
      } as CosmTokenInfo
    } as IToken
  }

  async fetchTokens(account: IChainAccount): Promise<void> {
    assert(account.networkKind === NetworkKind.COSM)
    if (!account.address) {
      return
    }

    const existingTokens = await this.getTokens(account)
    const existingTokensMap = new Map(existingTokens.map((t) => [t.token, t]))
    const whitelistedTokens = existingTokens.filter(
      (token) => token.visible === TokenVisibility.SHOW
    )

    const tokensBalance = await this._fetchTokens(account, whitelistedTokens)

    const bulkRemove = existingTokens
      .filter(
        (t) =>
          !tokensBalance.has(t.token) &&
          t.visible === TokenVisibility.UNSPECIFIED
      )
      .map((t) => t.id)

    const bulkAdd: IToken[] = []
    const bulkUpdate: [number, CosmTokenInfo][] = []
    for (const [token, info] of tokensBalance.entries()) {
      const existing = existingTokensMap.get(token)
      if (!existing) {
        bulkAdd.push({
          masterId: account.masterId,
          index: account.index,
          networkKind: account.networkKind,
          chainId: account.chainId,
          address: account.address,
          sortId: await getNextTokenSortId(account),
          token,
          visible: TokenVisibility.UNSPECIFIED,
          info
        } as IToken)
      } else {
        bulkUpdate.push([existing.id, info])
      }

      if (bulkRemove.length) {
        await DB.tokens.bulkDelete(bulkRemove)
      }
      if (bulkAdd.length) {
        await DB.tokens.bulkAdd(bulkAdd)
      }
      for (const [id, info] of bulkUpdate) {
        await DB.tokens.update(id, { info })
      }
    }
  }

  private async _fetchTokens(
    account: IChainAccount,
    whitelistedTokens: IToken[]
  ): Promise<Map<string, CosmTokenInfo>> {
    if (!account.address) {
      return new Map()
    }

    const tokensMap = await this._getTokensFromLists(account.chainId as string)
    whitelistedTokens.forEach((wt) => {
      if (!tokensMap.has(wt.token)) {
        tokensMap.set(wt.token, wt.info.info)
      }
    })
    if (!tokensMap.size) {
      return new Map()
    }

    const tokens = Array.from(tokensMap.values())

    const tick = Date.now()

    const tokenBalances = await this._fetchTokensBalance(account, tokens)

    const result = new Map<string, CosmTokenInfo>()
    for (const [token, balance] of tokenBalances) {
      const info = tokensMap.get(token)
      if (!info) continue

      if (new Decimal(balance).isZero()) continue

      result.set(token, {
        info,
        balance
      })
    }

    console.log(
      `query balances of ${tokens.length} tokens for account ${
        account.address
      }: ${(Date.now() - tick) / 1000}s`
    )

    return result
  }

  private async _fetchTokensBalance(
    account: IChainAccount,
    tokens: TokenInfo[]
  ) {
    assert(account.address)

    const network = await NETWORK_SERVICE.getNetwork({
      kind: NetworkKind.COSM,
      chainId: account.chainId
    })
    assert(network)

    const client = await getCosmClient(network)
    const queryClient = client.getQueryClient()

    const balances: Coin[] = (
      await queryClient.bank.allBalances(account.address)
    ).map(Coin.fromProto)
    const balancesMap = new Map(
      balances.map((balance) => [balance.denom, balance.amount.toString()])
    )

    return tokens.map((info) => {
      return [info.denom, balancesMap.get(info.denom) || '0']
    })
  }

  private async _getTokensFromLists(
    chainId: string
  ): Promise<Map<string, TokenInfo>> {
    const tokenLists = (await this.getTokenLists(NetworkKind.COSM)).filter(
      (list) => {
        // only consider enabled list
        return list.enabled
      }
    )
    const tokens = tokenLists
      .flatMap((list) =>
        (list.tokens as TokenInfo[]).filter((token) => {
          // filter out different chainId
          return token.chainId === chainId
        })
      )
      .reverse()
    // deduplicate
    return new Map<string, TokenInfo>(
      tokens.map((token) => {
        return [token.denom, token]
      })
    )
  }
}

export const COSM_TOKEN_SERVICE = new CosmTokenService()
