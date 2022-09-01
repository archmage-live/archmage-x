import { shallowCopy } from '@ethersproject/properties'
import { TokenList } from '@uniswap/token-lists'

import { DB } from '~lib/db'
import { NetworkKind } from '~lib/network'
import { ITokenList } from '~lib/schema'
import { TOKENLISTS_API } from '~lib/services/datasource/tokenlists'
import { LOCAL_STORE, StoreKey } from '~lib/store'

export class EvmTokenService {
  static async init() {
    const defaultTokenListUrls =
      await TOKENLISTS_API.getDefaultEvmTokenListUrls()
    const localDefaultTokenListUrls =
      (await LOCAL_STORE.get<Record<NetworkKind, string[]>>(
        StoreKey.TOKEN_LISTS
      )) || {}
    const local = localDefaultTokenListUrls[NetworkKind.EVM]
    if (
      local?.length === defaultTokenListUrls.length &&
      local.every((item, i) => item === defaultTokenListUrls[i])
    ) {
      // default token lists not changed
      return
    }

    const newUrls = defaultTokenListUrls.filter(
      (url) => !local || local.indexOf(url) < 0
    )
    localDefaultTokenListUrls[NetworkKind.EVM] = defaultTokenListUrls

    const existingLists = (
      await DB.tokenLists.where('networkKind').equals(NetworkKind.EVM).toArray()
    ).map((item) => item.url)
    const tokenLists = (
      await TOKENLISTS_API.getEvmTokenLists(
        newUrls.filter((url) => existingLists.indexOf(url) < 0)
      )
    ).map(({ url, tokenList }) => EvmTokenService.makeTokenList(url, tokenList))

    if (tokenLists.length) {
      if (!existingLists.length) {
        tokenLists[0].enabled = true // enable first list
      }

      await DB.tokenLists.bulkAdd(tokenLists)
    }

    await LOCAL_STORE.set(StoreKey.TOKEN_LISTS, localDefaultTokenListUrls)
  }

  private static makeTokenList(
    url: string,
    tokenList: TokenList,
    enabled = false
  ) {
    const info = shallowCopy(tokenList) as any
    delete info.tokens

    return {
      networkKind: NetworkKind.EVM,
      url,
      enabled,
      info,
      tokens: tokenList.tokens
    } as ITokenList
  }

  static async addTokenList(
    url: string,
    tokenList: TokenList,
    enabled: boolean
  ): Promise<ITokenList> {
    const item = EvmTokenService.makeTokenList(url, tokenList, enabled)
    item.id = await DB.tokenLists.add(item)
    return item
  }

  async addToken() {}
}
