import { useColorModeValue } from '@chakra-ui/react'
import assert from 'assert'
import aleoDarkLogo from 'data-base64:~assets/thirdparty/aleo-dark.svg'
import aleoLightLogo from 'data-base64:~assets/thirdparty/aleo.svg'
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { useAsyncRetry, useInterval } from 'react-use'

import { DB, getNextField } from '~lib/db'
import { isBackgroundWorker } from '~lib/detect'
import { NetworkKind } from '~lib/network'
import { AleoNetworkInfo } from '~lib/network/aleo'
import { AptosChainInfo } from '~lib/network/aptos'
import { BtcChainInfo } from '~lib/network/btc'
import { CosmAppChainInfo } from '~lib/network/cosm'
import { EvmChainInfo } from '~lib/network/evm'
import { SolanaChainInfo } from '~lib/network/solana'
import { StarknetChainInfo } from '~lib/network/starknet'
import { SuiChainInfo } from '~lib/network/sui'
import { ChainId, IChainAccount, INetwork, IToken } from '~lib/schema'
import {
  CHAINLIST_API,
  useEvmChainLogoUrl
} from '~lib/services/datasource/chainlist'
import {
  COSMOS_CHAIN_REGISTRY_API,
  useCosmChainLogoUrl
} from '~lib/services/datasource/cosmos'
import { DENOM_TO_SUBDIRECTORY } from '~lib/services/datasource/cosmostation/helpers'
import {
  CRYPTO_COMPARE_SERVICE,
  useCryptoComparePrice
} from '~lib/services/datasource/cryptocompare'
import { JIFFYSCAN_NETWORKS } from '~lib/services/datasource/jiffyscan'
import { CosmTokenInfo } from '~lib/services/token/cosm'

import { AleoNetworkService } from './aleoService'
import { AptosNetworkService } from './aptosService'
import { BtcNetworkService } from './btcService'
import { CosmNetworkService } from './cosmService'
import { EvmNetworkService } from './evmService'
import { SolanaNetworkService } from './solanaService'
import { StarknetNetworkService } from './starknetService'
import { SuiNetworkService } from './suiService'

export * from './reorder'

export interface NetworkInfo {
  name: string
  description?: string
  chainId: number | string
  isTestnet?: boolean
  currencyName: string
  currencySymbol: string
  decimals: number
  rpcUrl?: string
  explorerUrl?: string
}

export function getNetworkInfo(network: INetwork): NetworkInfo {
  switch (network.kind) {
    case NetworkKind.BTC: {
      const info = network.info as BtcChainInfo
      return {
        name: info.name,
        description: info.name,
        chainId: info.chainId,
        isTestnet: info.isTestnet,
        currencyName: info.currency.name,
        currencySymbol: info.currency.symbol,
        decimals: info.currency.decimals,
        rpcUrl: info.rpc.at(0),
        explorerUrl: info.explorers.at(0)
      }
    }
    case NetworkKind.EVM: {
      const info = network.info as EvmChainInfo
      return {
        name: info.name,
        description: info.title || info.name,
        chainId: info.chainId,
        isTestnet: info.network === 'testnet',
        currencyName: info.nativeCurrency.name,
        currencySymbol: info.nativeCurrency.symbol,
        decimals: info.nativeCurrency.decimals,
        rpcUrl: info.rpc.at(0),
        explorerUrl: info.explorers.at(0)?.url
      }
    }
    case NetworkKind.SOLANA: {
      const info = network.info as SolanaChainInfo
      return {
        name: info.name,
        description: info.name,
        chainId: info.chainId,
        isTestnet: info.isTestnet,
        currencyName: info.currency.name,
        currencySymbol: info.currency.symbol,
        decimals: info.currency.decimals,
        rpcUrl: info.rpc.at(0),
        explorerUrl: info.explorers.at(0)
      }
    }
    case NetworkKind.COSM: {
      const info = network.info as CosmAppChainInfo
      return {
        name: info.chainName,
        description: info.chainName,
        chainId: info.chainId,
        isTestnet: info.isTestnet,
        currencyName: info.stakeCurrency.coinDenom,
        currencySymbol: info.stakeCurrency.coinDenom,
        decimals: info.stakeCurrency.coinDecimals,
        rpcUrl: info.rpc,
        explorerUrl: info.txExplorer?.txUrl || 'https://www.mintscan.io'
      }
    }
    case NetworkKind.STARKNET: {
      const info = network.info as StarknetChainInfo
      return {
        name: info.name,
        description: info.name,
        chainId: info.chainId,
        isTestnet: info.isTestnet,
        currencyName: info.currency.name,
        currencySymbol: info.currency.symbol,
        decimals: info.currency.decimals,
        rpcUrl: info.baseUrl,
        explorerUrl: info.explorers.at(0)
      }
    }
    case NetworkKind.APTOS: {
      const info = network.info as AptosChainInfo
      return {
        name: info.name,
        description: info.name,
        chainId: info.chainId,
        isTestnet: info.isTestnet,
        currencyName: info.currency.name,
        currencySymbol: info.currency.symbol,
        decimals: info.currency.decimals,
        rpcUrl: info.rpc.at(0),
        explorerUrl: info.explorers.at(0)
      }
    }
    case NetworkKind.SUI: {
      const info = network.info as SuiChainInfo
      return {
        name: info.name,
        description: info.name,
        chainId: info.chainId,
        isTestnet: info.isTestnet,
        currencyName: info.currency.name,
        currencySymbol: info.currency.symbol,
        decimals: info.currency.decimals,
        rpcUrl: info.rpc.at(0),
        explorerUrl: info.explorers.at(0)
      }
    }
    case NetworkKind.ALEO: {
      const info = network.info as AleoNetworkInfo
      return {
        name: info.name,
        description: info.name,
        chainId: info.networkId,
        isTestnet: info.isTestnet,
        currencyName: info.currency.name,
        currencySymbol: info.currency.symbol,
        decimals: info.currency.decimals,
        rpcUrl: info.rpc.at(0),
        explorerUrl: info.explorers.at(0)
      }
    }
    default:
      return {} as NetworkInfo
  }
}

function subDirPathPrefix(network: INetwork, url: URL, pathPrefix: string) {
  if (network.kind === NetworkKind.COSM) {
    if (url.origin === 'https://www.mintscan.io') {
      const stakingDenom = (network.info as CosmAppChainInfo).stakeCurrency
        .coinMinimalDenom
      const subDir = DENOM_TO_SUBDIRECTORY[stakingDenom]
      if (subDir) {
        return `${subDir}/${pathPrefix}`
      }
    }
  }
  return pathPrefix
}

export function getAccountUrl(
  network: INetwork,
  account: IChainAccount | string
): string | undefined {
  const info = getNetworkInfo(network)
  const address = typeof account === 'string' ? account : account.address
  if (!info?.explorerUrl || !address) {
    return undefined
  }
  try {
    const url = new URL(info.explorerUrl)

    let pathPrefix
    switch (network.kind) {
      case NetworkKind.BTC:
        pathPrefix = 'address'
        break
      case NetworkKind.EVM:
        pathPrefix = 'address'
        break
      case NetworkKind.SOLANA:
        pathPrefix = 'account' // or 'address'
        break
      case NetworkKind.COSM:
        pathPrefix = subDirPathPrefix(network, url, 'account')
        break
      case NetworkKind.STARKNET:
        pathPrefix = 'contract'
        break
      case NetworkKind.APTOS:
        pathPrefix = !url.host.includes('aptoscan.com') ? 'account' : 'address'
        break
      case NetworkKind.SUI:
        pathPrefix = 'address'
        break
      default:
        return undefined
    }

    url.pathname = `/${pathPrefix}/${address}`
    return url.toString()
  } catch {
    return undefined
  }
}

export function getErc4337AccountUrl(
  network: INetwork,
  account: IChainAccount
): string | undefined {
  assert(network.kind === NetworkKind.EVM)
  const networkName = JIFFYSCAN_NETWORKS.get(Number(network.chainId))
  if (!networkName) {
    return
  }
  if (!account.address) {
    return
  }

  const url = new URL('https://jiffyscan.xyz')
  url.pathname = `/account/${account.address}`
  url.searchParams.set('network', networkName)
  return url.toString()
}

export function getTransactionUrl(
  network: INetwork,
  txId: string | number
): string | undefined {
  const info = getNetworkInfo(network)
  if (!info?.explorerUrl) {
    return undefined
  }
  try {
    const url = new URL(info.explorerUrl)

    let pathPrefix
    switch (network.kind) {
      case NetworkKind.BTC:
        pathPrefix = 'tx'
        break
      case NetworkKind.EVM:
        pathPrefix = 'tx'
        break
      case NetworkKind.SOLANA:
        pathPrefix = 'tx'
        break
      case NetworkKind.COSM:
        pathPrefix = subDirPathPrefix(network, url, 'txs')
        break
      case NetworkKind.STARKNET:
        pathPrefix = 'tx'
        break
      case NetworkKind.APTOS:
        pathPrefix = !url.host.includes('aptoscan.com') ? 'txn' : 'version'
        break
      case NetworkKind.SUI:
        pathPrefix = 'txblock'
        break
      case NetworkKind.ALEO:
        pathPrefix = 'transaction'
        break
      default:
        return undefined
    }

    url.pathname = `/${pathPrefix}/${txId}`
    return url.toString()
  } catch {
    return undefined
  }
}

export function getErc4337TransactionUrl(
  network: INetwork,
  txId: string | number
): string | undefined {
  assert(network.kind === NetworkKind.EVM)
  const networkName = JIFFYSCAN_NETWORKS.get(Number(network.chainId))
  if (!networkName) {
    return
  }

  const url = new URL('https://jiffyscan.xyz')
  url.pathname = `/userOpHash/${txId}`
  url.searchParams.set('network', networkName)
  return url.toString()
}

export function getTokenUrl(
  network: INetwork,
  token: IToken
): string | undefined {
  const info = getNetworkInfo(network)
  if (!info?.explorerUrl || !token) {
    return undefined
  }
  try {
    const url = new URL(info.explorerUrl)

    let pathPrefix
    let tokenId = token.token
    let tokenType
    switch (network.kind) {
      case NetworkKind.BTC:
        return undefined
      case NetworkKind.EVM:
        pathPrefix = 'token'
        break
      case NetworkKind.SOLANA:
        pathPrefix = 'account' // odd!
        break
      case NetworkKind.COSM:
        pathPrefix = subDirPathPrefix(network, url, 'assets')
        const info = (token.info as CosmTokenInfo).info
        tokenId = Buffer.from(info.denom).toString('base64')
        tokenType = info.type
        break
      case NetworkKind.STARKNET:
        pathPrefix = 'contract'
        break
      case NetworkKind.APTOS:
        // TODO
        return undefined
      case NetworkKind.SUI:
        pathPrefix = 'coin' // TODO
        return undefined
      default:
        return undefined
    }

    url.pathname = `/${pathPrefix}/${tokenId}`
    if (tokenType) {
      url.searchParams.set('type', tokenType)
    }
    return url.toString()
  } catch {
    return undefined
  }
}

export function getFaucetUrl(network: INetwork): string | undefined {
  switch (network.kind) {
    case NetworkKind.SOLANA: {
      const info = network.info as SolanaChainInfo
      return info.faucets?.at(0)
    }
    case NetworkKind.STARKNET: {
      const info = network.info as StarknetChainInfo
      return info.faucets?.at(0)
    }
    case NetworkKind.SUI: {
      const info = network.info as SuiChainInfo
      return info.faucets?.at(0)
    }
    case NetworkKind.ALEO: {
      const info = network.info as AleoNetworkInfo
      return info.faucets?.at(0)
    }
    default:
      return undefined
  }
}

export function getBridgeUrl(network: INetwork): string | undefined {
  switch (network.kind) {
    case NetworkKind.STARKNET: {
      const info = network.info as StarknetChainInfo
      return info.bridges?.at(0)
    }
    default:
      return undefined
  }
}

export class NetworkService {
  static async init() {
    if (isBackgroundWorker()) {
      await BtcNetworkService.init()
      await EvmNetworkService.init()
      await SolanaNetworkService.init()
      await CosmNetworkService.init()
      await StarknetNetworkService.init()
      await AptosNetworkService.init()
      await SuiNetworkService.init()
      await AleoNetworkService.init()
    }
  }

  async getNetworks(kind?: NetworkKind) {
    if (!kind) {
      return DB.networks.orderBy('sortId').toArray()
    } else {
      return DB.networks.where('kind').equals(kind).sortBy('sortId')
    }
  }

  async getNetwork(
    id: number | { kind: NetworkKind; chainId: ChainId }
  ): Promise<INetwork | undefined> {
    if (typeof id === 'number') {
      return DB.networks.get(id)
    } else {
      return DB.networks.where({ kind: id.kind, chainId: id.chainId }).first()
    }
  }

  async addNetwork(
    kind: NetworkKind,
    chainId: ChainId,
    info: any
  ): Promise<INetwork> {
    let network
    switch (kind) {
      case NetworkKind.BTC:
        network = BtcNetworkService.buildNetwork(chainId, info)
        break
      case NetworkKind.EVM:
        network = EvmNetworkService.buildNetwork(chainId, info)
        break
      case NetworkKind.SOLANA:
        network = SolanaNetworkService.buildNetwork(chainId, info)
        break
      case NetworkKind.COSM:
        network = CosmNetworkService.buildNetwork(chainId, info)
        break
      case NetworkKind.STARKNET:
        network = StarknetNetworkService.buildNetwork(chainId, info)
        break
      case NetworkKind.APTOS:
        network = AptosNetworkService.buildNetwork(chainId, info)
        break
      case NetworkKind.SUI:
        network = SuiNetworkService.buildNetwork(chainId, info)
        break
      case NetworkKind.ALEO:
        network = AleoNetworkService.buildNetwork(chainId, info)
        break
      default:
        throw new Error(`network ${kind} is not implemented`)
    }
    network.sortId = await getNextField(DB.networks)
    network.id = await DB.networks.add(network)
    return network
  }

  async deleteNetwork(id: number) {
    await DB.transaction(
      'rw',
      [
        DB.networks,
        DB.chainAccounts,
        DB.pendingTxs,
        DB.transactions,
        DB.tokens
      ],
      async () => {
        const network = await DB.networks.get(id)
        if (!network) {
          return
        }

        await DB.networks.delete(id)

        const query = { networkKind: network.kind, chainId: network.chainId }
        await DB.chainAccounts.where(query).delete()
        await DB.pendingTxs.where(query).delete()
        await DB.transactions.where(query).delete()
        await DB.tokens.where(query).delete()
      }
    )
  }
}

export const NETWORK_SERVICE = new NetworkService()

export function useNetworks(kind?: NetworkKind) {
  return useLiveQuery(() => {
    if (kind) {
      return DB.networks.where('kind').equals(kind).sortBy('sortId')
    } else {
      return DB.networks.orderBy('sortId').toArray()
    }
  }, [kind])
}

export function useNetworksInfo(networks?: INetwork[]) {
  return useMemo(() => networks?.map((net) => getNetworkInfo(net)), [networks])
}

export function useNetwork(id?: number) {
  return useLiveQuery(() => {
    if (id === undefined) {
      return undefined
    }
    return NETWORK_SERVICE.getNetwork(id)
  }, [id])
}

export function useNetwork2(kind?: NetworkKind, chainId?: ChainId) {
  return useLiveQuery(() => {
    if (kind === undefined || chainId === undefined) {
      return undefined
    }
    return NETWORK_SERVICE.getNetwork({
      kind,
      chainId
    })
  }, [kind, chainId])
}

export function useNetworkLogos(): Record<number, string> {
  const networks = useNetworks()
  const [logos, setLogos] = useState<Record<number, string>>({})

  const aleoLogo = useColorModeValue(aleoLightLogo, aleoDarkLogo)

  const { loading, error, retry } = useAsyncRetry(async () => {
    if (!networks) {
      return
    }

    for (const network of networks) {
      let logo: string | undefined
      switch (network.kind) {
        case NetworkKind.EVM: {
          logo = await CHAINLIST_API.getEvmChainLogoUrl(
            network.chainId as number
          )
          break
        }
        case NetworkKind.COSM: {
          logo = await COSMOS_CHAIN_REGISTRY_API.getLogoUrl(
            network.chainId as string
          )
          break
        }
        case NetworkKind.ALEO: {
          logo = aleoLogo
          break
        }
        default: {
          const info = getNetworkInfo(network)
          logo = await CRYPTO_COMPARE_SERVICE.getChainLogoUrl(
            info.currencySymbol
          )
          break
        }
      }

      if (!logo) {
        continue
      }

      setLogos((logos) => {
        return {
          ...logos,
          [network.id]: logo as string
        }
      })
    }
  }, [networks, aleoLogo])

  useInterval(retry, !loading && error ? 5000 : null)

  return logos
}

export function useNetworkLogoUrl(network?: INetwork) {
  const info = network && getNetworkInfo(network)

  const evmChainLogoUrl = useEvmChainLogoUrl(
    network?.kind === NetworkKind.EVM ? network?.chainId : undefined
  )

  const cosmChainLogoUrl = useCosmChainLogoUrl(
    network?.kind === NetworkKind.COSM ? network?.chainId : undefined
  )

  const result = useCryptoComparePrice(
    network?.kind !== NetworkKind.EVM &&
      network?.kind !== NetworkKind.COSM &&
      network?.kind !== NetworkKind.ALEO
      ? info?.currencySymbol
      : undefined
  )

  const aleoLogo = useColorModeValue(aleoLightLogo, aleoDarkLogo)

  switch (network?.kind) {
    case NetworkKind.EVM:
      return evmChainLogoUrl
    case NetworkKind.COSM:
      return cosmChainLogoUrl
    case NetworkKind.ALEO:
      return aleoLogo
    default:
      return result?.imageUrl
  }
}
