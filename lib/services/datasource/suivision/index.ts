import { normalizeSuiAddress, normalizeSuiObjectId } from '@mysten/sui.js/utils'
import { SUI_MAINNET_CHAIN, SUI_TESTNET_CHAIN } from '@mysten/wallet-standard'
import suiVisionLogo from 'data-base64:~assets/thirdparty/sui-vision.svg'

import { fetchJsonWithCache } from '~lib/fetch'
import { normalizeSuiType } from '~lib/wallet'

export interface TokenInfo {
  chainId: string

  coinType: string
  package?: string
  creator?: string

  name: string
  symbol: string
  decimals: number
  desc: string
  iconUrl?: string
}

export interface TokenList {
  url: string
  name: string
  desc: string
  logoURI: string
  tokens: TokenInfo[]
}

class SuiVisionApi {
  async getTokenList(chainId: string): Promise<TokenList | undefined> {
    const url = this._getUrl(chainId)
    if (!url) {
      return
    }

    const tokens = await this.getTokenInfos(chainId)
    if (!tokens) {
      return
    }

    return {
      url: url.toString(),
      name: `SuiVision Token List (${chainId})`,
      desc: 'latest',
      logoURI: suiVisionLogo,
      tokens
    } as TokenList
  }

  async getTokenInfos(chainId: string): Promise<TokenInfo[] | undefined> {
    const url = this._getUrl(chainId)
    if (!url) {
      return
    }

    const tokenInfos: TokenInfo[] = []
    const deduplicates = new Set<string>()
    let cursor: string | undefined
    while (true) {
      type Result = {
        code: number
        message: string
        result: {
          data: {
            coinID: string
            package: string
            creator: string
            name: string
            symbol: string
            decimals: number
            desc: string
            iconUrl: string
          }[]
          nextId: string
          total: number
        }
      }

      if (cursor) {
        url.searchParams.set('cursor', cursor)
      }

      let result: Result
      try {
        result = await fetchJsonWithCache(url.toString(), 1000 * 3600 * 24 * 7)
      } catch (err) {
        console.error(err)
        break
      }

      if (!result.result.data.length || !result.result.nextId) {
        // finished
        break
      }

      for (const item of result.result.data) {
        const coinType = normalizeSuiType(item.coinID)
        if (deduplicates.has(coinType)) {
          continue
        }
        deduplicates.add(coinType)
        tokenInfos.push({
          chainId,
          coinType,
          package: normalizeSuiObjectId(item.package),
          creator: normalizeSuiAddress(item.creator),
          name: item.name,
          symbol: item.symbol,
          decimals: item.decimals,
          desc: item.desc,
          iconUrl: item.iconUrl
        })
      }

      cursor = result.result.nextId
    }

    return tokenInfos
  }

  _getUrl(chainId: string) {
    let network
    switch (chainId) {
      case SUI_MAINNET_CHAIN:
        network = 'mainnet'
        break
    }

    if (!network) {
      return
    }

    return new URL(`https://internal.suivision.xyz/${network}/api/coinsList`)
  }
}

export const SUI_VISION_API = new SuiVisionApi()
