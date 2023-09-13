import { shallowCopy } from '@ethersproject/properties'
import { TokenInfo, TokenList } from '@uniswap/token-lists'
import assert from 'assert'
import Decimal from 'decimal.js'
import { ethers } from 'ethers'
import stableHash from 'stable-hash'

import { DB } from '~lib/db'
import { NetworkKind } from '~lib/network'
import { ERC20__factory } from '~lib/network/evm/abi'
import {
  ChainId,
  IChainAccount,
  IToken,
  ITokenList,
  TokenVisibility
} from '~lib/schema'
import { ETH_BALANCE_CHECKER_API } from '~lib/services/datasource/ethBalanceChecker'
import { TOKENLISTS_API } from '~lib/services/datasource/tokenlists'
import { NETWORK_SERVICE } from '~lib/services/network'
import { EvmClient } from '~lib/services/provider/evm/client'

import { SearchedTokenFromTokenLists, TokenBrief, TokenListBrief } from '.'
import { BaseTokenService } from './base'

type EvmTokenInfo = {
  info: TokenInfo
  balance: string
}

export function getEvmTokenBrief(token: IToken): TokenBrief {
  const { info, balance } = token.info as EvmTokenInfo
  return {
    name: info.name,
    iconUrl: info.logoURI,
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

export function getEvmTokenListBrief(
  token: ITokenList,
  chainId: ChainId
): TokenListBrief {
  const info = token.info as Omit<TokenList, 'tokens'>
  const { major, minor, patch } = info.version
  return {
    name: info.name,
    desc: `v${major}.${minor}.${patch}`,
    url: `https://tokenlists.org/token-list?url=${token.url}`,
    iconUrl: info.logoURI,
    tokenCount: token.tokens.reduce(
      (count, token: TokenInfo) => count + (token.chainId === chainId),
      0
    ),
    enabled: token.enabled
  }
}

export function formatEvmTokenIdentifier(token: string) {
  return ethers.utils.getAddress(token)
}

export class EvmTokenService extends BaseTokenService {
  async init() {
    if (!process.env.PLASMO_PUBLIC_ENABLE_EVM) {
      return
    }

    const init = await this._initDefaultTokenLists()

    if (!init) {
      await this._updateTokenLists()
    }

    console.log('initialized evm tokens')
  }

  private async _initDefaultTokenLists() {
    // Default token lists may be updated across Archmage versions
    const defaultTokenListUrls =
      await TOKENLISTS_API.getDefaultEvmTokenListUrls()

    return this.initDefaultTokenLists(
      NetworkKind.EVM,
      defaultTokenListUrls,
      async (urls: string[]) => {
        return (await TOKENLISTS_API.getTokenLists(urls)).map(
          ({ url, tokenList }) => this._makeTokenList(url, tokenList)
        )
      }
    )
  }

  private async _updateTokenLists() {
    const tokenLists = await this.getTokenLists(NetworkKind.EVM)
    const tokenListsMap = new Map(
      tokenLists.map((tokenList) => [tokenList.url, tokenList])
    )

    const updatedTokenLists = await TOKENLISTS_API.getTokenLists(
      tokenLists.map(({ url }) => url)
    )

    const updated = []
    for (const { url, tokenList } of updatedTokenLists) {
      const existing = tokenListsMap.get(url)
      if (!existing) {
        continue
      }
      const info = shallowCopy(tokenList) as any
      delete info.tokens
      if (
        stableHash(existing.info) !== stableHash(info) ||
        stableHash(existing.tokens) !== stableHash(tokenList.tokens)
      ) {
        const item = shallowCopy(existing)
        item.info = info
        item.tokens = tokenList.tokens
        updated.push(item)
      }
    }

    if (updated.length) {
      await DB.tokenLists.bulkPut(updated)
    }
  }

  private _makeTokenList(url: string, tokenList: TokenList, enabled = false) {
    const info = shallowCopy(tokenList) as any
    delete info.tokens

    return {
      networkKind: NetworkKind.EVM,
      url,
      enabled,
      info,
      tokens: tokenList.tokens
    } as ITokenList
  }

  async fetchTokenList(url: string): Promise<ITokenList | undefined> {
    let tokenList
    try {
      tokenList = await TOKENLISTS_API.getTokenList(url)
    } catch (err) {
      console.error(`get token list from ${url}: ${err}`)
    }
    if (!tokenList) {
      return
    }
    return this._makeTokenList(url, tokenList)
  }

  async searchTokenFromTokenLists(
    account: IChainAccount,
    token: string
  ): Promise<SearchedTokenFromTokenLists | undefined> {
    token = ethers.utils.getAddress(token)
    let foundToken: IToken | undefined
    const tokenLists = await this.getTokenLists(account.networkKind)
    const tokenList = tokenLists.find((tokenList) => {
      if (!tokenList.enabled) {
        return
      }
      return (tokenList.tokens as TokenInfo[]).find((info) => {
        if (
          info.chainId === account.chainId &&
          ethers.utils.getAddress(info.address) === token
        ) {
          foundToken = {
            masterId: account.masterId,
            index: account.index,
            networkKind: account.networkKind,
            chainId: account.chainId,
            address: account.address,
            sortId: 0, // TODO
            token,
            visible: TokenVisibility.UNSPECIFIED,
            info: {
              info
            } as EvmTokenInfo
          } as IToken
          return true
        }
      })
    })

    if (!tokenList || !foundToken) return undefined

    const info = foundToken.info as EvmTokenInfo
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

  async searchToken(account: IChainAccount, token: string) {
    assert(account.address)

    token = ethers.utils.getAddress(token)

    const network = await NETWORK_SERVICE.getNetwork({
      kind: NetworkKind.EVM,
      chainId: account.chainId
    })
    assert(network)
    const provider = await EvmClient.from(network)

    const tokenContract = ERC20__factory.connect(token, provider)
    const name = await tokenContract.name()
    const symbol = await tokenContract.symbol()
    const decimals = await tokenContract.decimals()
    const balance = (await tokenContract.balanceOf(account.address)).toString()
    return {
      masterId: account.masterId,
      index: account.index,
      networkKind: account.networkKind,
      chainId: account.chainId,
      address: account.address,
      sortId: 0, // TODO
      token,
      visible: TokenVisibility.UNSPECIFIED,
      info: {
        info: {
          chainId: account.chainId,
          address: token,
          name,
          decimals,
          symbol
        },
        balance
      } as EvmTokenInfo
    } as IToken
  }

  private async _getTokensFromLists(
    chainId: number
  ): Promise<Map<string, TokenInfo>> {
    const tokenLists = (await this.getTokenLists(NetworkKind.EVM)).filter(
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
        ;(token as any).address = ethers.utils.getAddress(token.address)
        return [token.address, token]
      })
    )
  }

  private async _fetchTokensBalance(
    account: IChainAccount,
    tokens: TokenInfo[]
  ) {
    assert(account.address)

    const network = await NETWORK_SERVICE.getNetwork({
      kind: NetworkKind.EVM,
      chainId: account.chainId
    })
    assert(network)
    const provider = await EvmClient.from(network)

    // batch query
    const balances = await ETH_BALANCE_CHECKER_API.getAddressBalances(
      provider,
      account.address,
      tokens.map((token) => token.address)
    )
    const tokenBalances = balances
      ? Object.entries(balances).map(([token, balance]) => [
          ethers.utils.getAddress(token),
          balance
        ])
      : []

    if (!balances) {
      // fallback to single query
      for (const token of tokens) {
        const tokenContract = ERC20__factory.connect(token.address, provider)
        const balance = (
          await tokenContract.balanceOf(account.address)
        ).toString()
        tokenBalances.push([token.address, balance])
      }
    }
    return tokenBalances
  }

  private async _fetchTokens(
    account: IChainAccount,
    whitelistedTokens: IToken[]
  ): Promise<Map<string, EvmTokenInfo>> {
    if (!account.address) {
      return new Map()
    }

    const tokensMap = await this._getTokensFromLists(+account.chainId)
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

    const result = new Map<string, EvmTokenInfo>()
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

  async fetchTokens(account: IChainAccount) {
    assert(account.networkKind === NetworkKind.EVM)
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
    const bulkUpdate: [number, EvmTokenInfo][] = []
    for (const [token, info] of tokensBalance.entries()) {
      const existing = existingTokensMap.get(token)
      if (!existing) {
        bulkAdd.push({
          masterId: account.masterId,
          index: account.index,
          networkKind: account.networkKind,
          chainId: account.chainId,
          address: account.address,
          sortId: 0, // TODO
          token,
          visible: TokenVisibility.UNSPECIFIED,
          info
        } as IToken)
      } else {
        bulkUpdate.push([existing.id, info])
      }
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

export const EVM_TOKEN_SERVICE = new EvmTokenService()
