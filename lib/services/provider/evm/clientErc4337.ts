import { TransactionResponse } from '@ethersproject/abstract-provider'
import { BigNumber } from '@ethersproject/bignumber'
import { AddressZero } from '@ethersproject/constants'
import { Network } from '@ethersproject/networks'
import { Deferrable } from '@ethersproject/properties'
import {
  BaseProvider,
  JsonRpcProvider,
  TransactionReceipt,
  TransactionRequest
} from '@ethersproject/providers'
import { ZeroDevProvider } from '@zerodevapp/sdk'

import { makeZeroDevProvider } from '~lib/erc4337/zerodev'
import { EvmChainInfo } from '~lib/network/evm'
import { INetwork } from '~lib/schema'

import { EvmClient } from './client'

// copy from @zerodevapp/sdk
export enum ExecuteType {
  EXECUTE = 'execute',
  EXECUTE_DELEGATE = 'executeDelegate',
  EXECUTE_BATCH = 'executeBatch'
}

export class EvmErc4337Client extends BaseProvider {
  constructor(network: INetwork, public provider: ZeroDevProvider) {
    const info = network.info as EvmChainInfo
    super({
      name: info.name,
      chainId: +network.chainId,
      ensAddress: info.ens?.registry,
      rpcUrls: info.rpc // extra field
    } as Network)
  }

  static async from(network: INetwork) {
    const provider = await makeZeroDevProvider({
      chainId: network.chainId,
      ownerAddress: AddressZero,
      providerOrSigner: new EvmClient(network)
    })
    if (!provider) {
      throw new Error('erc4337 not supported for this network')
    }
    return new EvmErc4337Client(network, provider)
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
