import Dexie from 'dexie'

import { DB } from '~lib/db'
import { NetworkKind } from '~lib/network'
import { IChainAccount, IToken, ITokenList, TokenVisibility } from '~lib/schema'
import { formatTokenIdentifier } from '~lib/services/token'
import { LOCAL_STORE, StoreKey } from '~lib/store'

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

  async addTokenList(tokenList: ITokenList): Promise<ITokenList> {
    tokenList.id = await DB.tokenLists.add(tokenList)
    return tokenList
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

  async getToken(id: number | { account: IChainAccount; token: string }) {
    if (typeof id === 'number') {
      return DB.tokens.get(id)
    } else {
      const { account, token } = id
      return DB.tokens
        .where({
          masterId: account.masterId,
          index: account.index,
          networkKind: account.networkKind,
          chainId: account.chainId,
          address: account.address,
          token: formatTokenIdentifier(account.networkKind, token)
        })
        .first()
    }
  }

  async addToken(
    args: IToken | { account: IChainAccount; token: string; info: any }
  ): Promise<IToken> {
    const isToken = (token: any): token is IToken => {
      return !!(token as IToken).address
    }

    let token
    if (!isToken(args)) {
      const { account, token: tokenAddr, info } = args
      token = {
        masterId: account.masterId,
        index: account.index,
        networkKind: account.networkKind,
        chainId: account.chainId,
        address: account.address,
        sortId: 0, // TODO
        token: tokenAddr,
        visible: TokenVisibility.SHOW,
        info
      } as IToken
    } else {
      token = args
    }

    token.id = await DB.tokens.add(token)
    return token
  }

  async setTokenVisibility(id: number, visible: TokenVisibility) {
    await DB.tokens.update(id, {
      visible
    })
  }

  /**
   * Initialize default token lists
   * @param networkKind
   * @param defaultTokenListUrls
   * @param fetchTokenLists
   * @protected
   */
  protected async initDefaultTokenLists(
    networkKind: NetworkKind,
    defaultTokenListUrls: string[],
    fetchTokenLists: (urls: string[]) => Promise<ITokenList[]>
  ) {
    const localDefaultTokenListUrls =
      (await LOCAL_STORE.get<Record<NetworkKind, string[]>>(
        StoreKey.TOKEN_LISTS
      )) || {}
    const local = localDefaultTokenListUrls[networkKind]

    // check if default token lists changed
    if (
      local?.length === defaultTokenListUrls.length &&
      local.every((item, i) => item === defaultTokenListUrls[i])
    ) {
      // default token lists not changed
      return false
    }

    // update default token lists urls
    localDefaultTokenListUrls[networkKind] = defaultTokenListUrls

    const newListUrls = defaultTokenListUrls.filter(
      (url) => !local || local.indexOf(url) < 0
    )

    const existingListUrls = (await this.getTokenLists(networkKind)).map(
      (item) => item.url
    )

    // fetch new token lists
    const newTokenLists = await fetchTokenLists(
      newListUrls.filter((url) => existingListUrls.indexOf(url) < 0)
    )

    // persist new token lists
    if (newTokenLists.length) {
      if (!existingListUrls.length) {
        // enable first list
        newTokenLists[0].enabled = true
      }

      await DB.tokenLists.bulkAdd(newTokenLists)
    }

    // persist default token lists urls
    await LOCAL_STORE.set(StoreKey.TOKEN_LISTS, localDefaultTokenListUrls)

    return true
  }
}
