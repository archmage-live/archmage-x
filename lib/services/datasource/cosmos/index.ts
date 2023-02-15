import type { AssetList, Chain } from '@chain-registry/types'
import { useQuery } from '@tanstack/react-query'
import cosmosIcon from 'data-base64:~assets/thirdparty/cosmos-sdk-icon.svg'

import { fetchJsonWithCache } from '~lib/fetch'
import { QueryService } from '~lib/query'
import { ChainId } from '~lib/schema'

import { CHAIN_ID_TO_SUBDIRECTORY } from './helpers'

class CosmosChainRegistryApi {
  async getChain(chainId: string): Promise<Chain | undefined> {
    const subDir = CHAIN_ID_TO_SUBDIRECTORY[chainId]
    if (!subDir) {
      return
    }

    const url = `https://github.com/cosmos/chain-registry/raw/master/${subDir}/chain.json`

    const chain: Chain = await fetchJsonWithCache(url, 1000 * 3600 * 24 * 7)

    return chain
  }

  async getAssetList(chainId: string): Promise<AssetList | undefined> {
    const subDir = CHAIN_ID_TO_SUBDIRECTORY[chainId]
    if (!subDir) {
      return
    }

    const url = `https://github.com/cosmos/chain-registry/raw/master/${subDir}/assetlist.json`

    const assetList: AssetList = await fetchJsonWithCache(
      url,
      1000 * 3600 * 24 * 7
    )

    return assetList
  }
}

export const COSMOS_CHAIN_REGISTRY_API = new CosmosChainRegistryApi()

export function useCosmChainLogoUrl(chainId?: ChainId): string | undefined {
  const { data: assetList } = useQuery(
    [QueryService.COSMOS_CHAIN_REGISTRY, 'getAssetList', chainId],
    async () =>
      typeof chainId === 'string'
        ? COSMOS_CHAIN_REGISTRY_API.getAssetList(chainId)
        : null
  )

  return assetList?.assets[0].logo_URIs?.png || cosmosIcon
}
