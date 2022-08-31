import { shallowCopy } from '@ethersproject/properties'
import { TokenList } from '@uniswap/token-lists'

import { DB } from '~lib/db'
import { NetworkKind } from '~lib/network'
import { ITokenList } from '~lib/schema'

interface IEvmTokenService {}

class EvmTokenService {
  async init() {
  }

  async addTokenList(url: string, tokenList: TokenList) {
    const info = shallowCopy(tokenList) as any
    delete info.tokens

    const item = {
      networkKind: NetworkKind.EVM,
      url,
      info,
      tokens: tokenList.tokens
    } as ITokenList

    item.id = await DB.tokenLists.add(item)
    return item
  }

  async addToken() {}
}
