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

  async getOsmosisAssetList(chainId: string): Promise<AssetList | undefined> {
    const url = `https://github.com/osmosis-labs/assetlists/blob/main/${chainId}/${chainId}.assetlist.json`
    const assetList: AssetList = await fetchJsonWithCache(
      url,
      1000 * 3600 * 24 * 7
    )
    return assetList
  }

  async getLogoUrl(chainId: string): Promise<string> {
    const assetList = await COSMOS_CHAIN_REGISTRY_API.getAssetList(chainId)
    return assetList?.assets[0].logo_URIs?.png || cosmosIcon
  }
}

export const COSMOS_CHAIN_REGISTRY_API = new CosmosChainRegistryApi()

export function useCosmChainLogoUrl(chainId?: ChainId): string | undefined {
  const { data: logoUrl } = useQuery(
    [QueryService.COSMOS_CHAIN_REGISTRY, 'getAssetList', chainId],
    async () =>
      typeof chainId === 'string'
        ? COSMOS_CHAIN_REGISTRY_API.getLogoUrl(chainId)
        : null
  )

  return logoUrl || cosmosIcon
}
