import type {
  UserOperationReceipt as _UserOperationReceipt,
  UserOperationResponse as _UserOperationResponse
} from '@alchemy/aa-core'
import { Signer, VoidSigner } from '@ethersproject/abstract-signer'
import { JsonRpcProvider } from '@ethersproject/providers'
import {
  ZeroDevProvider,
  ZeroDevSigner,
  getZeroDevProvider,
  getZeroDevSigner
} from '@zerodevapp/sdk'
import assert from 'assert'

import { ChainId } from '~lib/schema'

const ZERO_DEV_PROJECTS = new Map([
  [1, process.env.PLASMO_PUBLIC_ZERODEV_ETHEREUM],
  [42161, process.env.PLASMO_PUBLIC_ZERODEV_ARBITRUM],
  [137, process.env.PLASMO_PUBLIC_ZERODEV_POLYGON],
  [43114, process.env.PLASMO_PUBLIC_ZERODEV_AVALANCHE],
  [5, process.env.PLASMO_PUBLIC_ZERODEV_ETHEREUM_GOERLI],
  [421613, process.env.PLASMO_PUBLIC_ZERODEV_ARBITRUM_GOERLI],
  [420, process.env.PLASMO_PUBLIC_ZERODEV_OPTIMISM_GOERLI],
  [80001, process.env.PLASMO_PUBLIC_ZERODEV_POLYGON_MUMBAI],
  [43113, process.env.PLASMO_PUBLIC_ZERODEV_AVALANCHE_FUJI],
  [84531, process.env.PLASMO_PUBLIC_ZERODEV_BASE_GOERLI]
])

export function isZeroDevSupported(chainId: ChainId) {
  return Boolean(ZERO_DEV_PROJECTS.get(chainId as number))
}

export async function makeZeroDevProvider({
  chainId,
  ownerAddress,
  providerOrSigner
}: {
  chainId: ChainId
  ownerAddress: string
  providerOrSigner: Signer | JsonRpcProvider
}): Promise<ZeroDevProvider> {
  const projectId = ZERO_DEV_PROJECTS.get(chainId as number)
  if (!projectId) {
    throw new Error('erc4337 not supported for this network')
  }

  let signer, provider
  if (providerOrSigner instanceof JsonRpcProvider) {
    signer = new VoidSigner(ownerAddress, providerOrSigner)
    provider = providerOrSigner
  } else {
    signer = providerOrSigner
    provider = signer.provider
    assert(provider instanceof JsonRpcProvider)
  }

  return getZeroDevProvider({
    projectId,
    owner: signer,
    index: 0,
    rpcProvider: provider,
    address: undefined
  })
}

export async function makeZeroDevSigner({
  provider,
  signer
}: {
  provider: ZeroDevProvider
  signer: Signer
}): Promise<ZeroDevSigner> {
  assert(provider.originalProvider instanceof JsonRpcProvider)

  return getZeroDevSigner({
    projectId: provider.config.projectId,
    owner: signer,
    index: provider.config.index,
    rpcProvider: provider.originalProvider,
    address: provider.config.walletAddress
  })
}

export class ZeroDevRpcClient {
  private readonly userOpJsonRpcProvider: JsonRpcProvider

  initializing: Promise<void>

  constructor(provider: ZeroDevProvider) {
    const rpcClient = provider.httpRpcClient
    this.userOpJsonRpcProvider = (rpcClient as any).userOpJsonRpcProvider
    this.initializing = rpcClient.initializing
  }

  async getUserOperationResponse(hash: string): Promise<UserOperationResponse> {
    await this.initializing
    return await this.userOpJsonRpcProvider.send('eth_getUserOperationByHash', [
      hash
    ])
  }

  async getUserOperationReceipt(hash: string): Promise<UserOperationReceipt> {
    await this.initializing
    return await this.userOpJsonRpcProvider.send(
      'eth_getUserOperationReceipt',
      [hash]
    )
  }
}

export type UserOperationResponse = {
  userOperation: Omit<
    _UserOperationResponse,
    'entryPoint' | 'blockNumber' | 'blockHash' | 'transactionHash'
  >
} & Pick<
  _UserOperationResponse,
  'entryPoint' | 'blockNumber' | 'blockHash' | 'transactionHash'
>

export type UserOperationReceipt = _UserOperationReceipt
