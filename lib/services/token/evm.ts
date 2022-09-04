import { shallowCopy } from '@ethersproject/properties'
import { TokenList } from '@uniswap/token-lists'
import { TokenInfo } from '@uniswap/token-lists/src/types'
import assert from 'assert'
import Decimal from 'decimal.js'
import { ethers } from 'ethers'

import { DB } from '~lib/db'
import { NetworkKind } from '~lib/network'
import { ERC20__factory } from '~lib/network/evm/abi'
import { IChainAccount, IToken, ITokenList, TokenVisibility } from '~lib/schema'
import { ETH_BALANCE_CHECKER_API } from '~lib/services/datasource/ethBalanceChecker'
import { TOKENLISTS_API } from '~lib/services/datasource/tokenlists'
import { NETWORK_SERVICE } from '~lib/services/network'
import { EvmProvider } from '~lib/services/provider/evm'
import { LOCAL_STORE, StoreKey } from '~lib/store'

import { TokenBrief, TokenListBrief } from '.'
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
      amount: new Decimal(balance)
        .div(new Decimal(10).pow(info.decimals))
        .toString(),
      amountParticle: balance
    }
  }
}

export function getEvmTokenListBrief(token: ITokenList): TokenListBrief {
  const info = token.info as Omit<TokenList, 'tokens'>
  const { major, minor, patch } = info.version
  return {
    name: info.name,
    desc: `v${major}.${minor}.${patch}`,
    url: `https://tokenlists.org/token-list?url=${token.url}`,
    iconUrl: info.logoURI,
    tokenCount: token.tokens.length,
    enabled: token.enabled
  }
}

export class EvmTokenService extends BaseTokenService {
  async init() {
    const defaultTokenListUrls =
      await TOKENLISTS_API.getDefaultEvmTokenListUrls()
    const localDefaultTokenListUrls =
      (await LOCAL_STORE.get<Record<NetworkKind, string[]>>(
        StoreKey.TOKEN_LISTS
      )) || {}
    const local = localDefaultTokenListUrls[NetworkKind.EVM]
    if (
      local?.length === defaultTokenListUrls.length &&
      local.every((item, i) => item === defaultTokenListUrls[i])
    ) {
      // default token lists not changed
      return
    }

    const newUrls = defaultTokenListUrls.filter(
      (url) => !local || local.indexOf(url) < 0
    )
    localDefaultTokenListUrls[NetworkKind.EVM] = defaultTokenListUrls

    const existingLists = (
      await DB.tokenLists.where('networkKind').equals(NetworkKind.EVM).toArray()
    ).map((item) => item.url)
    const tokenLists = (
      await TOKENLISTS_API.getEvmTokenLists(
        newUrls.filter((url) => existingLists.indexOf(url) < 0)
      )
    ).map(({ url, tokenList }) => this.makeTokenList(url, tokenList))

    if (tokenLists.length) {
      if (!existingLists.length) {
        tokenLists[0].enabled = true // enable first list
      }

      await DB.tokenLists.bulkAdd(tokenLists)
    }

    await LOCAL_STORE.set(StoreKey.TOKEN_LISTS, localDefaultTokenListUrls)
  }

  private makeTokenList(url: string, tokenList: TokenList, enabled = false) {
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

  async addTokenList(
    url: string,
    tokenList: TokenList,
    enabled: boolean
  ): Promise<ITokenList> {
    const item = this.makeTokenList(url, tokenList, enabled)
    item.id = await DB.tokenLists.add(item)
    return item
  }

  async getTokensFromLists(chainId: number): Promise<Map<string, TokenInfo>> {
    const tokenLists = (
      await DB.tokenLists.where('networkKind').equals(NetworkKind.EVM).toArray()
    ).filter((list) => {
      // only consider enabled list
      return list.enabled
    })
    const tokens = tokenLists.flatMap((list) =>
      (list.tokens as TokenInfo[]).filter((token) => {
        // filter out different chainId
        return token.chainId === chainId
      })
    )
    // deduplicate
    return new Map<string, TokenInfo>(
      tokens.map((token) => [ethers.utils.getAddress(token.address), token])
    )
  }

  private async _fetchTokensBalance(
    account: IChainAccount,
    whitelistedTokens: IToken[],
    blacklistedTokens: IToken[]
  ): Promise<Map<string, EvmTokenInfo>> {
    if (!account.address) {
      return new Map()
    }
    const network = await NETWORK_SERVICE.getNetwork({
      kind: NetworkKind.EVM,
      chainId: account.chainId
    })
    assert(network)
    const provider = await EvmProvider.from(network)

    const tokensMap = await this.getTokensFromLists(+account.chainId)
    whitelistedTokens.forEach((wt) => {
      if (!tokensMap.has(wt.token)) {
        tokensMap.set(wt.token, wt.info.info)
      }
    })
    blacklistedTokens.forEach((bt) => {
      if (tokensMap.has(bt.token)) {
        tokensMap.delete(bt.token)
      }
    })
    if (!tokensMap.size) {
      return new Map()
    }

    const tokens = Array.from(tokensMap.values())

    const tick = Date.now()

    // batch query
    const balances = await ETH_BALANCE_CHECKER_API.getAddressBalances(
      provider,
      account.address,
      tokens.map((token) => token.address)
    )
    const tokenBalances = balances ? Object.entries(balances) : []

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
    const blacklistedTokens = existingTokens.filter(
      (token) => token.visible === TokenVisibility.HIDE
    )

    const tokensBalance = await this._fetchTokensBalance(
      account,
      whitelistedTokens,
      blacklistedTokens
    )

    const bulkRemove = existingTokens
      .filter((t) => !tokensBalance.has(t.token))
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
          sortId: 0,
          token: token,
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

  async addToken() {}
}

export const EVM_TOKEN_SERVICE = new EvmTokenService()
