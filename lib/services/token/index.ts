import { DB } from '~lib/db'
import { ENV } from '~lib/env'
import { NetworkKind } from '~lib/network'
import { IChainAccount, IToken, TokenVisibility } from '~lib/schema'

import { EvmTokenService } from './evm'

interface ITokenService {}

class TokenService {
  constructor() {
    if (ENV.inServiceWorker) {
      this.init()
    }
  }

  private async init() {
    await EvmTokenService.init()
  }

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
    return DB.tokens
      .where('[masterId+index+networkKind+chainId+address]')
      .below([
        account.masterId,
        account.index,
        account.networkKind,
        account.chainId,
        account.address
      ])
      .toArray()
  }

  async setTokenVisibility(id: number, visible: boolean) {
    await DB.tokens.update(id, {
      visible: visible ? TokenVisibility.SHOW : TokenVisibility.HIDE
    })
  }
}

const TOKEN_SERVICE = new TokenService()
