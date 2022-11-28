import { IChainAccount } from "~lib/schema";
import { DB } from "~lib/db";

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
}
