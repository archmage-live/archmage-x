import {
  toEcdsaKernelSmartAccount,
  toLightSmartAccount,
  toNexusSmartAccount,
  toSafeSmartAccount,
  toSimpleSmartAccount,
  toTrustSmartAccount
} from 'permissionless/accounts'
import { LocalAccount, PublicClient, http } from 'viem'
import {
  BundlerClient,
  SmartAccount,
  createBundlerClient,
  toCoinbaseSmartAccount,
  toSoladySmartAccount
} from 'viem/account-abstraction'

import { Erc4337AccountType } from '~archmage/wallet/types'
import { ChainId, INetwork } from '~lib/schema'

import { createEthClient, getCachedClient } from './client'

export type EthErc4337Client = BundlerClient

const clients = new Map<number, EthErc4337Client>()

export async function createEthErc4337Client(
  network: INetwork | ChainId
): Promise<EthErc4337Client> {
  const { client: cached, network: net } = await getCachedClient(
    clients,
    network
  )
  if (cached) {
    return cached
  }

  const c = await createEthClient(network)
  const client = createBundlerClient({
    client: c,
    transport: http(`https://public.pimlico.io/v2/${+net.chainId}/rpc`) // TODO
  })

  clients.set(+net.chainId, client)

  return client
}

export async function createEthErc4337Account(
  owners: LocalAccount[],
  type: Erc4337AccountType,
  client: PublicClient
): Promise<SmartAccount> {
  switch (type) {
    case Erc4337AccountType.Coinbase:
      return await toCoinbaseSmartAccount({
        client,
        owners
      })
    case Erc4337AccountType.Biconomy:
      return await toNexusSmartAccount({
        client,
        owners: owners as any,
        version: '1.0.0'
      })
    case Erc4337AccountType.Alchemy:
      return await toLightSmartAccount({
        client,
        owner: owners[0],
        version: '2.0.0'
      })
    case Erc4337AccountType.ZeroDev:
      return await toEcdsaKernelSmartAccount({
        client,
        owners: owners as any,
        version: '0.3.1'
      })
    case Erc4337AccountType.Safe:
      return await toSafeSmartAccount({
        client,
        owners: owners as any,
        version: '1.4.1'
      })
    case Erc4337AccountType.Infinitism:
      return await toSimpleSmartAccount({
        client,
        owner: owners[0]
      })
    case Erc4337AccountType.Solady:
      return await toSoladySmartAccount({
        client,
        owner: owners[0]
      })
    case Erc4337AccountType.Trust:
      return await toTrustSmartAccount({
        client,
        owner: owners[0],
        entryPoint: undefined as any
      })
  }
}
