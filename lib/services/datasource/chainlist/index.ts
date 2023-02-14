import { toUtf8String } from '@ethersproject/strings'
import { useQuery } from '@tanstack/react-query'
import * as fs from 'fs'
import { useMemo } from 'react'

import { fetchDataWithCache } from '~lib/fetch'
import { QueryService } from '~lib/query'
import { ChainId } from '~lib/schema'

class ChainListApi {
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

  _getEvmChainLogoUrl(
    chainId: number,
    chainNames: Map<number, string>
  ): string {
    const unknownLogoUrl = `https://github.com/DefiLlama/chainlist/raw/main/public/unknown-logo.png`
    const chainName = chainNames.get(chainId)
    if (!chainName) {
      return unknownLogoUrl
    }
    return `https://icons.llamao.fi/icons/chains/rsz_${chainName}`
  }

  async getEvmChainLogoUrl(chainId: number): Promise<string | undefined> {
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
    if (typeof chainId !== 'number' || !chainNames) {
      return 'https://github.com/DefiLlama/chainlist/raw/main/public/unknown-logo.png'
    }
    return CHAINLIST_API._getEvmChainLogoUrl(chainId, chainNames)
  }, [chainId, chainNames])
}
