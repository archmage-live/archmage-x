import {
  SimpleSmartAccountOwner,
  SimpleSmartContractAccount,
  getChain
} from '@alchemy/aa-core'
import { AccountSigner, EthersProviderAdapter } from '@alchemy/aa-ethers'
import { Signer, VoidSigner } from '@ethersproject/abstract-signer'
import { JsonRpcProvider } from '@ethersproject/providers'
import { Alchemy } from 'alchemy-sdk'
import assert from 'assert'

import { ChainId } from '~lib/schema'
import { defaultApiKey, networkByChain } from '~lib/services/datasource/alchemy'

const ENTRYPOINT_ADDRESS = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'

const SIMPLE_ACCOUNT_FACTORY_ADDRESS =
  '0x9406Cc6185a346906296840746125a0E44976454'

export async function makeAlchemyProvider({
  chainId,
  ownerAddress,
  providerOrSigner
}: {
  chainId: ChainId
  ownerAddress: string
  providerOrSigner: Signer | JsonRpcProvider
}): Promise<AccountSigner | undefined> {
  const network = networkByChain.get(+chainId)
  if (!network) {
    return
  }

  let signer: Signer, provider: JsonRpcProvider
  if (providerOrSigner instanceof JsonRpcProvider) {
    signer = new VoidSigner(ownerAddress, providerOrSigner)
    provider = providerOrSigner
  } else {
    signer = providerOrSigner
    assert(signer.provider instanceof JsonRpcProvider)
    provider = signer.provider
  }

  const alchemy = new Alchemy({
    apiKey: defaultApiKey,
    network
    // url: provider.connection.url,
  })
  const alchemyProvider = await alchemy.config.getProvider()

  const owner: SimpleSmartAccountOwner = {
    getAddress: async () =>
      Promise.resolve((await signer.getAddress()) as `0x${string}`),
    signMessage: async (msg: Uint8Array | string) =>
      (await signer.signMessage(msg)) as `0x${string}`
  }

  return EthersProviderAdapter.fromEthersProvider(
    alchemyProvider,
    ENTRYPOINT_ADDRESS
  ).connectToAccount(
    (rpcClient) =>
      new SimpleSmartContractAccount({
        entryPointAddress: ENTRYPOINT_ADDRESS,
        chain: getChain(alchemyProvider.network.chainId),
        owner,
        factoryAddress: SIMPLE_ACCOUNT_FACTORY_ADDRESS,
        rpcClient
      })
  )
}

export async function makeAlchemySigner({
  provider,
  signer
}: {
  provider: AccountSigner
  signer: Signer
}): Promise<AccountSigner> {
  const owner: SimpleSmartAccountOwner = {
    getAddress: async () =>
      Promise.resolve((await signer.getAddress()) as `0x${string}`),
    signMessage: async (msg: Uint8Array | string) =>
      (await signer.signMessage(msg)) as `0x${string}`
  }

  const chain = getChain(await provider.getChainId())

  return provider.provider.connectToAccount(
    (rpcClient) =>
      new SimpleSmartContractAccount({
        entryPointAddress: ENTRYPOINT_ADDRESS,
        chain,
        owner,
        factoryAddress: SIMPLE_ACCOUNT_FACTORY_ADDRESS,
        rpcClient
      })
  )
}
