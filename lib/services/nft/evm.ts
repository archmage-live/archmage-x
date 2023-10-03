import { NftFilters } from '@archmagelive/alchemy-sdk'
import { getAddress } from '@ethersproject/address'
import assert from 'assert'
import stableHash from 'stable-hash'

import { DB, getNextField } from '~lib/db'
import { NetworkKind } from '~lib/network'
import { IChainAccount, INft, NftVisibility } from '~lib/schema'
import { ALCHEMY_API, AlchemyNft } from '~lib/services/datasource/alchemy'

import { NftBrief } from '.'
import { BaseNftService, formatNftUniqueKey } from './base'

// import { MoralisNft } from "~lib/services/datasource/moralis";

export type EvmNftInfo = AlchemyNft // | MoralisNft

export function getEvmNftBrief(nft: INft): NftBrief {
  const info = nft.info as EvmNftInfo
  return {
    name:
      info.contract.openSea?.collectionName ||
      info.contract.name ||
      info.rawMetadata?.name ||
      info.title,
    tokenId: Number(info.tokenId).toString(),
    imageUrl:
      info.media.at(0)?.gateway ||
      info.media.at(0)?.raw ||
      info.rawMetadata?.image,
    balance: info.balance
  }
}

export class EvmNftService extends BaseNftService {
  private async _fetchNfts(
    account: IChainAccount
  ): Promise<Map<string, EvmNftInfo>> {
    const alchemyApi = ALCHEMY_API.api(+account.chainId)
    if (!alchemyApi) {
      return new Map()
    }

    const result = new Map()

    let nextPageKey: string | undefined = undefined
    while (true) {
      // @ts-ignore
      const { ownedNfts, pageKey } = await alchemyApi.nft.getNftsForOwner(
        account.address!,
        {
          pageKey: nextPageKey,
          excludeFilters: [NftFilters.SPAM]
        }
      )

      for (const nft of ownedNfts) {
        const collection = formatEvmNftCollection(nft.contract.address)
        const tokenId = formatEvmNftIdentifier(nft.tokenId)
        result.set(formatNftUniqueKey({ collection, tokenId }), nft)
      }

      if (!pageKey) {
        break
      }
      nextPageKey = pageKey
    }

    return result
  }

  async fetchNfts(account: IChainAccount): Promise<void> {
    assert(account.networkKind === NetworkKind.EVM)
    if (!account.address) {
      return
    }

    const existingNfts = await this.getNfts(account)
    const existingNftsMap = new Map(
      existingNfts.map((nft) => [formatNftUniqueKey(nft), nft])
    )

    const fetchedNfts = await this._fetchNfts(account)

    const bulkRemove = existingNfts
      .filter((t) => !fetchedNfts.has(formatNftUniqueKey(t)))
      .map((t) => t.id)

    const bulkAdd: INft[] = []
    const bulkUpdate: [number, EvmNftInfo][] = []
    for (const [key, info] of fetchedNfts.entries()) {
      const existing = existingNftsMap.get(key)
      if (!existing) {
        bulkAdd.push({
          masterId: account.masterId,
          index: account.index,
          networkKind: account.networkKind,
          chainId: account.chainId,
          address: account.address,
          sortId: await getNextField(DB.nfts),
          collection: formatEvmNftCollection(info.contract.address),
          tokenId: formatEvmNftIdentifier(info.tokenId),
          visible: NftVisibility.UNSPECIFIED,
          info
        } as INft)
      } else if (stableHash(existing.info) !== stableHash(info)) {
        bulkUpdate.push([existing.id, info])
      }
    }

    if (bulkRemove.length) {
      await DB.nfts.bulkDelete(bulkRemove)
    }
    if (bulkAdd.length) {
      await DB.nfts.bulkAdd(bulkAdd)
    }
    for (const [id, info] of bulkUpdate) {
      await DB.nfts.update(id, { info })
    }
  }
}

export const EVM_NFT_SERVICE = new EvmNftService()

export function formatEvmNftCollection(collection: string) {
  return getAddress(collection)
}

export function formatEvmNftIdentifier(tokenId: string) {
  return Number(tokenId).toString()
}
