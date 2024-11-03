import type { BlockTag } from 'viem'

import { isErc4337Account } from '~lib/erc4337'
import { IChainAccount, INetwork } from '~lib/schema'
import { Provider, TransactionPayload } from '~lib/services/provider/provider'

import { EthClient, createEthClient } from './client'
import { EthErc4337Client, createEthErc4337Client } from './clientErc4337'

export class EthProvider extends Provider {
  private constructor(
    private client: EthClient,
    private erc4337Client: EthErc4337Client
  ) {
    super()
  }

  static async from(network: INetwork): Promise<EthProvider> {
    const client = await createEthClient(network)
    const erc4337Client = await createEthErc4337Client(network)
    return new EthProvider(client, erc4337Client)
  }

  async getNextNonce(
    account: IChainAccount,
    tag?: BlockTag | number
  ): Promise<number> {
    if (!(await isErc4337Account(account))) {
      return await this.client.getTransactionCount({
        address: account.address!
      })
    } else {
      return await this.erc4337Client
    }
  }
}
