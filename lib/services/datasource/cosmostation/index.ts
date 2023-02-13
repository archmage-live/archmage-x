// @ts-ignore
import stableHash from 'stable-hash'

import { fetchJsonWithCache } from '~lib/fetch'
import { CosmAppChainInfo } from '~lib/network/cosm'

import { DENOM_TO_SUBDIRECTORY, validateTokenInfo } from './helpers'

export type TokenType =
  | 'staking'
  | 'native'
  | 'ibc'
  | 'pool'
  | 'bridge'
  | 'cw20'
  | 'erc20'

export interface TokenInfo {
  chainId: string
  denom: string
  type: TokenType
  origin_chain: string
  origin_denom: string
  origin_type: TokenType
  symbol: string
  decimals: number
  description?: string
  image: string
  coinGeckoId: string

  /******** ibc ********/
  enable: boolean
  channel: string
  port: string
  counter_party: {
    channel: string
    port: string
    denom: string
  }
  path: string
  contract: string
}

export interface TokenList {
  url: string
  name: string
  desc: string
  logoURI: string
  tokens: TokenInfo[]
}

export const COSMOSTATION_REPO_URL = 'https://github.com/cosmostation/chainlist'

class CosmostationApi {
  async getTokenList(
    chain: CosmAppChainInfo,
    tokenList?: TokenList
  ): Promise<TokenList | undefined> {
    if (!tokenList) {
      tokenList = {
        url: COSMOSTATION_REPO_URL,
        name: 'Cosmostation Token List',
        desc: 'latest',
        logoURI:
          'https://github.com/cosmostation/chainlist/raw/main/dapp/cosmostation/cosmoskit/cosmostation.png',
        tokens: []
      }
    }

    const tokenInfos = await this.getTokenInfos(chain)
    if (!tokenInfos) {
      return
    }

    let updated = false
    for (const info of tokenInfos) {
      const index = tokenList.tokens.findIndex(
        (token) => token.chainId === info.chainId && token.denom === info.denom
      )
      if (index > -1) {
        if (stableHash(tokenList.tokens[index]) !== stableHash(info)) {
          tokenList.tokens[index] = info
          updated = true
        }
      } else {
        tokenList.tokens.push(info)
        updated = true
      }
    }

    return updated ? tokenList : undefined
  }

  async getTokenInfos(
    chain: CosmAppChainInfo
  ): Promise<TokenInfo[] | undefined> {
    const stakingDenom = chain.stakeCurrency.coinMinimalDenom
    const subDir = DENOM_TO_SUBDIRECTORY[stakingDenom]
    if (!subDir) {
      return
    }

    const url = `https://github.com/cosmostation/chainlist/raw/main/chain/${subDir}/assets.json`
    const tokenInfos: TokenInfo[] = await fetchJsonWithCache(
      url,
      1000 * 3600 * 24 * 7
    )

    return tokenInfos
      .map((info) => {
        info.chainId = chain.chainId
        if (info.image) {
          info.image = `https://github.com/cosmostation/chainlist/raw/main/chain/${info.image}`
        }
        return info
      })
      .filter(validateTokenInfo)
  }
}

export const COSMOSTATION_API = new CosmostationApi()
