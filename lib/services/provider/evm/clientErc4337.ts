import { TransactionResponse } from '@ethersproject/abstract-provider'
import { AddressZero } from '@ethersproject/constants'
import {
  BaseProvider,
  JsonRpcProvider,
  TransactionReceipt
} from '@ethersproject/providers'
import { ZeroDevProvider } from '@zerodevapp/sdk'

import { isZeroDevSupported, makeZeroDevProvider } from '~lib/erc4337/zerodev'
import { ChainId, INetwork } from '~lib/schema'

import { EvmClient, getCachedProvider } from './client'

// copy from @zerodevapp/sdk
export enum ExecuteType {
  EXECUTE = 'execute',
  EXECUTE_DELEGATE = 'executeDelegate',
  EXECUTE_BATCH = 'executeBatch'
}

export class EvmErc4337Client extends EvmClient {
  constructor(network: INetwork, public provider: ZeroDevProvider) {
    super(network)
  }

  private static erc4337Clients = new Map<
    number,
    BaseProvider | Promise<BaseProvider>
  >()

  static async fromMayUndefined(network: INetwork | ChainId) {
    const { cached, network: net } = await getCachedProvider(
      this.erc4337Clients,
      network
    )
    if (cached) {
      return cached as EvmErc4337Client
    }

    if (!isZeroDevSupported(net.chainId)) {
      return
    }

    const client = (async () => {
      const provider = await makeZeroDevProvider({
        chainId: net.chainId,
        ownerAddress: AddressZero, // placeholder, should not be used
        providerOrSigner: new EvmClient(net)
      })
      return new EvmErc4337Client(net, provider)
    })()

    this.erc4337Clients.set(+net.chainId, client)

    return await client
  }

  async send(method: string, params: Array<any>): Promise<any> {
    return (this.provider.originalProvider as JsonRpcProvider).send(
      method,
      params
    )
  }

  async perform(method: string, params: any): Promise<any> {
    return await this.provider.perform(method, params)
  }

  async getTransaction(
    transactionHash: string | Promise<string>
  ): Promise<TransactionResponse> {
    // TODO: zerodev
    return await this.provider.getTransaction(transactionHash)
  }

  async getTransactionReceipt(
    transactionHash: string | Promise<string>
  ): Promise<TransactionReceipt> {
    return await this.provider.getTransactionReceipt(transactionHash)
  }

  async waitForTransaction(
    transactionHash: string,
    confirmations?: number,
    timeout?: number
  ): Promise<TransactionReceipt> {
    return await this.provider.waitForTransaction(
      transactionHash,
      confirmations,
      timeout
    )
  }
}
