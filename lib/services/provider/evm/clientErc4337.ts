import { AddressZero } from '@ethersproject/constants'
import { Network } from '@ethersproject/networks'
import { BaseProvider, JsonRpcProvider } from '@ethersproject/providers'
import { ZeroDevProvider } from '@zerodevapp/sdk'

import {
  ZeroDevRpcClient,
  isZeroDevSupported,
  makeZeroDevProvider
} from '~lib/erc4337/zerodev'
import { EvmChainInfo } from '~lib/network/evm'
import { ChainId, IChainAccount, INetwork } from '~lib/schema'
import { Erc4337Wallet, getSigningWallet } from '~lib/wallet'

import type { UserOperationReceipt, UserOperationResponse } from '.'
import { EvmClient, getCachedProvider } from './client'

// copy from @zerodevapp/sdk
export enum ExecuteType {
  EXECUTE = 'execute',
  EXECUTE_DELEGATE = 'executeDelegate',
  EXECUTE_BATCH = 'executeBatch'
}

export class EvmErc4337Client extends EvmClient {
  private constructor(network: INetwork, public provider: ZeroDevProvider) {
    super(network)
  }

  private static erc4337Clients = new Map<
    number,
    BaseProvider | Promise<BaseProvider>
  >()
  private static erc4337Providers = new Map<
    number,
    Map<string, ZeroDevProvider | Promise<ZeroDevProvider>>
  >()

  static async fromMayUndefined(network: INetwork | ChainId) {
    const { cached, network: net } = await getCachedProvider(
      this.erc4337Clients,
      network
    )
    if (cached) {
      return cached as unknown as EvmErc4337Client
    }

    if (!isZeroDevSupported(net.chainId)) {
      return
    }

    const client = (async () => {
      // address zero as placeholder, should not be used
      const provider = await EvmErc4337Client.getProvider(net, AddressZero)
      return new EvmErc4337Client(net, provider)
    })()

    this.erc4337Clients.set(+net.chainId, client as any)

    return await client
  }

  static async getProvider(
    network: INetwork,
    accountOrAddress?: IChainAccount | string
  ) {
    const address =
      (typeof accountOrAddress === 'object'
        ? (
            (await getSigningWallet(accountOrAddress)) as unknown as
              | Erc4337Wallet
              | undefined
          )?.owner
        : accountOrAddress) || AddressZero

    const cachedByAddress = EvmErc4337Client.erc4337Providers.get(
      +network.chainId
    )
    const cached = await cachedByAddress?.get(address)
    if (cached) {
      const info = network.info as EvmChainInfo
      const net = (await cached.originalProvider.getNetwork()) as Network & {
        rpcUrls: string[]
      }
      if (
        net.name === info.name &&
        net.ensAddress === info.ens?.registry &&
        net.rpcUrls.length === info.rpc.length &&
        net.rpcUrls.every((url, i) => url === info.rpc[i])
      ) {
        // all the same, so return cached
        return cached
      }
    }

    const provider = makeZeroDevProvider({
      chainId: network.chainId,
      ownerAddress: address,
      providerOrSigner: await EvmClient.from(network)
    })

    EvmErc4337Client.erc4337Providers.set(
      +network.chainId,
      (cachedByAddress ?? new Map()).set(address, provider)
    )

    return await provider
  }

  async getProvider(accountOrAddress?: IChainAccount | string) {
    return await EvmErc4337Client.getProvider(this.iNetwork, accountOrAddress)
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

  async getTransactionCount(
    addressOrName: string | Promise<string>,
    ...args: any[]
  ): Promise<number> {
    const address = await this._getAddress(addressOrName)
    const provider = await this.getProvider(address)
    // treat userOp nonce as transaction count
    return (await provider.smartAccountAPI.getNonce()).toNumber()
  }

  // @ts-ignore
  async getTransaction(
    userOpHash: string | Promise<string>,
    account?: IChainAccount
  ): Promise<UserOperationResponse> {
    const provider = await this.getProvider(account)
    const rpcClient = new ZeroDevRpcClient(provider)
    const rep = await rpcClient.getUserOperationResponse(await userOpHash)

    const userOp = rep.userOperation
    delete (rep as any).userOperation

    return {
      ...rep,
      ...userOp,
      hash: await userOpHash,
      timestamp: (await provider.getBlock(Number(rep.blockNumber.toString())))
        .timestamp
    }
  }

  // @ts-ignore
  async getTransactionReceipt(
    userOpHash: string | Promise<string>,
    account?: IChainAccount
  ): Promise<UserOperationReceipt> {
    const provider = await this.getProvider(account)
    const rpcClient = new ZeroDevRpcClient(provider)
    return await rpcClient.getUserOperationReceipt(await userOpHash)
  }

  // @ts-ignore
  async waitForTransaction(
    userOpHash: string,
    confirmations?: number,
    timeout?: number,
    replaceable?: any,
    account?: IChainAccount
  ): Promise<UserOperationReceipt> {
    const provider = await this.getProvider(account)
    await provider.waitForTransaction(userOpHash, confirmations, timeout)

    const rpcClient = new ZeroDevRpcClient(provider)
    return await rpcClient.getUserOperationReceipt(userOpHash)
  }
}
