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
        'https://github.com/DefiLlama/chainlist/raw/main/constants/chainIds.js',
        1000 * 3600 * 24 * 7
      )
    } catch {
      data = fs.readFileSync(__dirname + '/chainIds.js')
    }

    try {
      let str = toUtf8String(data)
      str = str.slice(str.indexOf('{') - 1, str.indexOf('}'))
      return new Map(
        Array.from(str.matchAll(/(\d+):\s+"(\S+)"/g)).map((item: any) => [
          +item[1],
          item[2]
        ])
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
    return `https://defillama.com/chain-icons/rsz_${chainName}.jpg`
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
      return undefined
    }
    return CHAINLIST_API._getEvmChainLogoUrl(chainId, chainNames)
  }, [chainId, chainNames])
}
