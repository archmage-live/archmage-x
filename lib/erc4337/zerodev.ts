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

export async function makeZeroDevProvider({
  chainId,
  ownerAddress,
  providerOrSigner
}: {
  chainId: ChainId
  ownerAddress: string
  providerOrSigner: Signer | JsonRpcProvider
}): Promise<ZeroDevProvider | undefined> {
  const projectId = ZERO_DEV_PROJECTS.get(chainId as number)
  if (!projectId) {
    return
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
