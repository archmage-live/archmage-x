import { normalizeStructTag } from '@mysten/sui.js/src/utils/sui-types'
import { normalizeSuiAddress, normalizeSuiObjectId } from '@mysten/sui.js/utils'
import {
  SUI_DEVNET_CHAIN,
  SUI_MAINNET_CHAIN,
  SUI_TESTNET_CHAIN
} from '@mysten/wallet-standard'
import suiScanLogo from 'data-base64:~assets/thirdparty/sui-scan.svg'

import { fetchJsonWithCache } from '~lib/fetch'
import { TokenInfo, TokenList } from '~lib/services/datasource/suivision'

class SuiScanApi {
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
      name: `SuiScan Token List (${chainId})`,
      desc: 'latest',
      logoURI: suiScanLogo,
      tokens
    } as TokenList
  }

  async getTokenInfos(chainId: string): Promise<TokenInfo[] | undefined> {
    const url = this._getUrl(chainId)
    if (!url) {
      return
    }

    url.searchParams.set('size', '100')
    url.searchParams.set('sortBy', 'HOLDERS')
    url.searchParams.set('orderBy', 'DESC')

    const tokenInfos: TokenInfo[] = []
    const deduplicates = new Set<string>()
    let page = 0
    while (true) {
      type Result = {
        content: {
          type: string
          packageId: string
          creator: string
          name: string
          symbol: string
          decimals: number
          description: string
          iconUrl: string
        }[]
      }

      url.searchParams.set('page', page.toString())

      let result: Result
      try {
        result = await fetchJsonWithCache(url.toString(), 1000 * 3600 * 24 * 7)
      } catch (err) {
        console.error(err)
        break
      }

      if (!result.content.length) {
        // finished
        break
      }

      for (const item of result.content) {
        const coinType = normalizeStructTag(item.type)
        if (deduplicates.has(coinType)) {
          continue
        }
        deduplicates.add(coinType)
        tokenInfos.push({
          chainId,
          coinType,
          package: normalizeSuiObjectId(item.packageId),
          creator: normalizeSuiAddress(item.creator),
          name: item.name,
          symbol: item.symbol,
          decimals: item.decimals,
          desc: item.description,
          iconUrl: item.iconUrl
        })
      }

      page += 1
    }

    return tokenInfos
  }

  _getUrl(chainId: string) {
    let network
    switch (chainId) {
      case SUI_MAINNET_CHAIN:
        network = 'mainnet'
        break
      case SUI_TESTNET_CHAIN:
        network = 'testnet-wave-3'
        break
      case SUI_DEVNET_CHAIN:
        network = 'devnet'
        break
    }
    if (!network) {
      return
    }

    return new URL(`https://suiscan.xyz/api/sui-backend/${network}/api/coins`)
  }
}

export const SUI_SCAN_API = new SuiScanApi()
