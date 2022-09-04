import Dexie from 'dexie'

import { DB } from '~lib/db'
import { NetworkKind } from '~lib/network'
import { IChainAccount, IToken, TokenVisibility } from '~lib/schema'

export class BaseTokenService {
  async getTokenLists(networkKind: NetworkKind) {
    return DB.tokenLists.where('networkKind').equals(networkKind).toArray()
  }

  async getTokenList(networkKind: NetworkKind, url: string) {
    return DB.tokenLists
      .where('[networkKind+url]')
      .equals([networkKind, url])
      .first()
  }

  async enableTokenList(id: number, enabled: boolean) {
    await DB.tokenLists.update(id, { enabled })
  }

  async deleteTokenList(id: number) {
    await DB.tokenLists.delete(id)
  }

  async getTokenCount(account: IChainAccount): Promise<number> {
    if (!account.address) {
      return 0
    }
    return DB.tokens
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

  async getTokens(account: IChainAccount): Promise<IToken[]> {
    if (!account.address) {
      return []
    }
    return DB.tokens
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

  async getToken(id: number) {
    return DB.tokens.get(id)
  }

  async setTokenVisibility(id: number, visible: boolean) {
    await DB.tokens.update(id, {
      visible: visible ? TokenVisibility.SHOW : TokenVisibility.HIDE
    })
  }
}
