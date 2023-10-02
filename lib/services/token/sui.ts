import { shallowCopy } from '@ethersproject/properties'
import { normalizeStructTag } from '@mysten/sui.js/utils'
import assert from 'assert'
import Decimal from 'decimal.js'
import { useAsync } from 'react-use'

import { DB, getNextField } from '~lib/db'
import { NetworkKind } from '~lib/network'
import {
  ChainId,
  IChainAccount,
  IToken,
  ITokenList,
  TokenVisibility
} from '~lib/schema'
import { SUI_SCAN_API } from '~lib/services/datasource/suiscan'
import {
  SUI_VISION_API,
  TokenInfo,
  TokenList
} from '~lib/services/datasource/suivision'
import { NETWORK_SERVICE } from '~lib/services/network'
import { getSuiClient } from '~lib/services/provider/sui/client'

import { SearchedTokenFromTokenLists, TokenBrief, TokenListBrief } from '.'
import { BaseTokenService } from './base'

export type SuiTokenInfo = {
  info: TokenInfo
  balance: string
}

export function getSuiTokenBrief(token: IToken): TokenBrief {
  const { info, balance } = token.info as SuiTokenInfo
  return {
    name: info.symbol,
    iconUrl: info.iconUrl,
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

export function getSuiTokenListBrief(
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

export class SuiTokenService extends BaseTokenService {
  async init() {
    if (!process.env.PLASMO_PUBLIC_ENABLE_SUI) {
      return
    }

    const init = await this._initDefaultTokenLists()
    if (!init) {
      // TODO: update
    }

    console.log('initialized sui tokens')
  }

  private async _initDefaultTokenLists() {
    const networks = await NETWORK_SERVICE.getNetworks(NetworkKind.SUI)
    const defaultTokenLists: TokenList[] = []
    for (const network of networks) {
      let tokenList = await SUI_VISION_API.getTokenList(
        network.chainId as string
      )
      if (tokenList) {
        defaultTokenLists.push(tokenList)
      }
      tokenList = await SUI_SCAN_API.getTokenList(network.chainId as string)
      if (tokenList) {
        defaultTokenLists.push(tokenList)
      }
    }

    return this.initDefaultTokenLists(
      NetworkKind.SUI,
      defaultTokenLists.map(({ url }) => url),
      async (urls: string[]) => {
        const tokenLists: ITokenList[] = []
        for (const url of urls) {
          const list = defaultTokenLists.find((list) => list.url === url)
          assert(list)
          tokenLists.push(this._makeTokenList(url, list))
        }
        return tokenLists
      }
    )
  }

  private _makeTokenList(url: string, tokenList: TokenList, enabled = false) {
    const info = shallowCopy(tokenList) as any
    delete info.tokens

    return {
      networkKind: NetworkKind.SUI,
      url,
      enabled,
      info,
      tokens: tokenList.tokens
    } as ITokenList
  }

  async fetchTokenList(url: string): Promise<ITokenList | undefined> {
    return undefined
  }

  async searchTokenFromTokenLists(
    account: IChainAccount,
    token: string // coin type
  ): Promise<SearchedTokenFromTokenLists | undefined> {
    assert(account.networkKind === NetworkKind.SUI)

    token = normalizeStructTag(token)

    let foundToken: IToken | undefined
    const tokenLists = await this.getTokenLists(account.networkKind)
    const tokenList = tokenLists.find((tokenList) => {
      if (!tokenList.enabled) {
        return
      }
      return (tokenList.tokens as TokenInfo[]).find((info) => {
        if (info.chainId === account.chainId && info.coinType === token) {
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
            } as SuiTokenInfo
          } as IToken
          return true
        }
      })
    })

    if (!tokenList || !foundToken) return undefined

    const info = foundToken.info as SuiTokenInfo
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
    token: string // coin type
  ): Promise<IToken | undefined> {
    assert(account.networkKind === NetworkKind.SUI)
    assert(account.address)

    token = normalizeStructTag(token)

    const network = await NETWORK_SERVICE.getNetwork({
      kind: NetworkKind.SUI,
      chainId: account.chainId
    })
    assert(network)

    const client = await getSuiClient(network)

    const metadata = await client.getCoinMetadata({ coinType: token })
    const balance = await client.getBalance({
      owner: account.address,
      coinType: token
    })

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
          coinType: token,
          package: undefined,
          creator: undefined,
          name: metadata?.name || '',
          symbol: metadata?.symbol || token,
          decimals: metadata?.decimals || 0,
          desc: metadata?.description || '',
          iconUrl: metadata?.iconUrl
        } as TokenInfo,
        balance: balance.totalBalance
      } as SuiTokenInfo
    } as IToken
  }

  async fetchTokens(account: IChainAccount): Promise<void> {
    assert(account.networkKind === NetworkKind.SUI)
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
    const bulkUpdate: [number, SuiTokenInfo][] = []
    for (const [token, info] of tokensBalance.entries()) {
      const existing = existingTokensMap.get(token)
      if (!existing) {
        bulkAdd.push({
          masterId: account.masterId,
          index: account.index,
          networkKind: account.networkKind,
          chainId: account.chainId,
          address: account.address,
          sortId: await getNextField(DB.tokens),
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
  ): Promise<Map<string, SuiTokenInfo>> {
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

    const result = new Map<string, SuiTokenInfo>()
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
      kind: NetworkKind.SUI,
      chainId: account.chainId
    })
    assert(network)

    const client = await getSuiClient(network)
    const balances = await client.getAllBalances({ owner: account.address })
    const balancesMap = new Map(
      balances.map((balance) => [
        normalizeStructTag(balance.coinType),
        balance.totalBalance
      ])
    )

    return tokens.map((info) => {
      return [info.coinType, balancesMap.get(info.coinType) || '0']
    })
  }

  private async _getTokensFromLists(
    chainId: string
  ): Promise<Map<string, TokenInfo>> {
    const tokenLists = (await this.getTokenLists(NetworkKind.SUI)).filter(
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
        return [token.coinType, token]
      })
    )
  }
}

export const SUI_TOKEN_SERVICE = new SuiTokenService()

export function useSuiTokenInfos(chainId?: ChainId) {
  const { value } = useAsync(async () => {
    if (!chainId) {
      return
    }
    const tokenLists = await SUI_TOKEN_SERVICE.getTokenLists(NetworkKind.SUI)
    const tokenInfos = tokenLists
      .flatMap((tokenList) => tokenList.tokens as TokenInfo[])
      .filter((tokenInfo) => tokenInfo.chainId === chainId)
    return new Map(
      tokenInfos.map((tokenInfo) => [tokenInfo.coinType, tokenInfo])
    )
  }, [chainId])

  return value
}
