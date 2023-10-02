import Dexie from 'dexie'

import { DB, getNextField } from '~lib/db'
import { NetworkKind } from '~lib/network'
import { IChainAccount, INft, NftVisibility } from '~lib/schema'

import { formatEvmNftCollection, formatEvmNftIdentifier } from './evm'

export class BaseNftService {
  async getNftCount(account: IChainAccount): Promise<number> {
    if (!account.address) {
      return 0
    }
    return DB.nfts
      .where('[masterId+index+networkKind+chainId+address]')
      .equals([
        account.masterId,
        account.index,
        account.networkKind,
        account.chainId,
        account.address
      ])
      .count()
  }

  async getNfts(account: IChainAccount): Promise<INft[]> {
    if (!account.address) {
      return []
    }
    return DB.nfts
      .where('[masterId+index+networkKind+chainId+address+sortId]')
      .between(
        [
          account.masterId,
          account.index,
          account.networkKind,
          account.chainId,
          account.address,
          Dexie.minKey
        ],
        [
          account.masterId,
          account.index,
          account.networkKind,
          account.chainId,
          account.address,
          Dexie.maxKey
        ]
      )
      .toArray()
  }

  async getNft(
    id: number | { account: IChainAccount; collection: string; tokenId: string }
  ): Promise<INft | undefined> {
    if (typeof id === 'number') {
      return DB.nfts.get(id)
    } else {
      const { account, collection, tokenId } = id
      return DB.nfts
        .where({
          masterId: account.masterId,
          index: account.index,
          networkKind: account.networkKind,
          chainId: account.chainId,
          address: account.address,
          collection: formatNftCollection(account.networkKind, collection),
          tokenId: formatNftIdentifier(account.networkKind, tokenId)
        })
        .first()
    }
  }

  async addNft(
    args:
      | INft
      | {
          account: IChainAccount
          collection: string
          tokenId: string
          info: any
        }
  ): Promise<INft> {
    const isNft = (token: any): token is INft => {
      return !!(token as INft).address
    }

    let nft
    if (!isNft(args)) {
      const { account, collection, tokenId, info } = args
      nft = {
        masterId: account.masterId,
        index: account.index,
        networkKind: account.networkKind,
        chainId: account.chainId,
        address: account.address,
        sortId: await getNextField(DB.nfts),
        collection,
        tokenId,
        visible: NftVisibility.UNSPECIFIED,
        info
      } as INft
    } else {
      nft = args
    }

    nft.id = await DB.nfts.add(nft)
    return nft
  }

  async setNftVisibility(id: number, visible: NftVisibility): Promise<void> {
    await DB.nfts.update(id, {
      visible
    })
  }
}

export function formatNftCollection(
  networkKind: NetworkKind,
  collection: string
) {
  switch (networkKind) {
    case NetworkKind.EVM:
      return formatEvmNftCollection(collection)
    default:
      return collection
  }
}

export function formatNftIdentifier(networkKind: NetworkKind, tokenId: string) {
  switch (networkKind) {
    case NetworkKind.EVM:
      return formatEvmNftIdentifier(tokenId)
    default:
      return tokenId
  }
}

export function formatNftUniqueKey({
  collection,
  tokenId
}: {
  collection: string
  tokenId: string
}) {
  return `${collection}-${tokenId}`
}
