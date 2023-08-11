import { toUtf8String } from '@ethersproject/strings'
import { useQuery } from '@tanstack/react-query'
import * as fs from 'fs'
import { useMemo } from 'react'

import { fetchDataWithCache } from '~lib/fetch'
import { QueryService } from '~lib/query'
import { ChainId } from '~lib/schema'

class ChainListApi {
  static unknownLogoUrl = `https://github.com/DefiLlama/chainlist/raw/main/public/unknown-logo.png`

  async getDefillamaEvmChainNames(): Promise<Map<number, string>> {
    let data
    try {
      data = await fetchDataWithCache(
        'https://github.com/DefiLlama/chainlist/raw/main/constants/chainIds.json',
        1000 * 3600 * 24 * 7
      )
    } catch {
      data = fs.readFileSync(__dirname + '/chainIds.json')
    }

    try {
      const chainIds = JSON.parse(toUtf8String(data))
      return new Map(
        Object.entries(chainIds).map((item) => [+item[0], item[1] as string])
      )
    } catch (err) {
      console.error('getDefillamaEvmChainNames:', err)
      throw err
    }
  }

  getLocalDefillamaEvmChainNames(): Map<number, string> {
    const data = fs.readFileSync(__dirname + '/chainIds.json')
    const chainIds = JSON.parse(toUtf8String(data))
    return new Map(
      Object.entries(chainIds).map((item) => [+item[0], item[1] as string])
    )
  }

  _getEvmChainLogoUrl(
    chainId: number,
    chainNames: Map<number, string>
  ): string {
    let chainName = chainNames.get(chainId)
    if (!chainName) {
      return ChainListApi.unknownLogoUrl
    }

    // special case for zksync
    if (chainName === 'era') {
      chainName = 'zksync era'
    }

    return `https://icons.llamao.fi/icons/chains/rsz_${chainName}`
  }

  async getEvmChainLogoUrl(chainId: number): Promise<string> {
    const chainNames = await this.getDefillamaEvmChainNames()
    return this._getEvmChainLogoUrl(chainId, chainNames)
  }
}

export const CHAINLIST_API = new ChainListApi()

export function useEvmChainLogoUrl(chainId?: ChainId): string | undefined {
  const { data: chainNames } = useQuery(
    [QueryService.CHAIN_LIST, 'getDefillamaEvmChainNames'],
    async () => CHAINLIST_API.getDefillamaEvmChainNames()
  )

  return useMemo(() => {
    if (typeof chainId !== 'number') {
      return ChainListApi.unknownLogoUrl
    }

    const localChainNames = CHAINLIST_API.getLocalDefillamaEvmChainNames()

    return CHAINLIST_API._getEvmChainLogoUrl(
      chainId,
      chainNames || localChainNames
    )
  }, [chainId, chainNames])
}
