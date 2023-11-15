import { Provider } from '@ethersproject/abstract-provider'
import { Signer } from '@ethersproject/abstract-signer'
import _SafeApiKit, {
  AllTransactionsListResponse,
  AllTransactionsOptions,
  EthereumTxWithTransfersResponse,
  SafeApiKitConfig,
  SafeModuleTransactionWithTransfersResponse,
  SafeMultisigTransactionListResponse,
  SafeMultisigTransactionWithTransfersResponse
} from '@safe-global/api-kit'
import Safe, {
  EthersAdapter,
  PredictedSafeProps,
  SafeAccountConfig,
  SafeFactory
} from '@safe-global/protocol-kit'
import { EthAdapter } from '@safe-global/safe-core-sdk-types'
import assert from 'assert'
import { ethers } from 'ethers'

import { NetworkKind } from '~lib/network'
import {
  ChainId,
  IChainAccount,
  INetwork,
  ISubWallet,
  IWallet
} from '~lib/schema'
import { EvmClient } from '~lib/services/provider/evm'
import { SafeInfo, isMultisigWallet } from '~lib/wallet'

export type { SafeVersion } from '@safe-global/safe-core-sdk-types'
export type { SafeAccountConfig }

export * from './safeTransactions'

export const SAFE_VERSIONS = ['1.4.1', '1.3.0', '1.2.0', '1.1.1', '1.0.0']

// https://docs.safe.global/safe-core-api/available-services
const SAFE_TX_SERVICE_URLS = new Map([
  [1, 'https://safe-transaction-mainnet.safe.global'],
  [5, 'https://safe-transaction-goerli.safe.global'],
  [137, 'https://safe-transaction-polygon.safe.global'],
  [42161, 'https://safe-transaction-arbitrum.safe.global'],
  [10, 'https://safe-transaction-optimism.safe.global'],
  [43114, 'https://safe-transaction-avalanche.safe.global'],
  [56, 'https://safe-transaction-bsc.safe.global'],
  [100, 'https://safe-transaction-gnosis-chain.safe.global'],
  [1313161554, 'https://safe-transaction-aurora.safe.global'],
  [8453, 'https://safe-transaction-base.safe.global'],
  [84531, 'https://safe-transaction-base-testnet.safe.global'],
  [42220, 'https://safe-transaction-celo.safe.global'],
  [1101, 'https://safe-transaction-zkevm.safe.global'],
  [324, 'https://safe-transaction-zksync.safe.global']
])

export function isSafeSupported(chainId: ChainId) {
  return Boolean(SAFE_TX_SERVICE_URLS.get(chainId as number))
}

export function getSafeService(provider: Provider, chainId: ChainId) {
  const txServiceUrl = SAFE_TX_SERVICE_URLS.get(chainId as number)
  assert(txServiceUrl)
  const ethAdapter = new EthersAdapter({
    ethers,
    signerOrProvider: provider
  })
  return new SafeApiKit({ txServiceUrl, ethAdapter })
}

export async function getSafeAccount(
  provider: Provider,
  safeAddressOrPredictedSafe: string | PredictedSafeProps,
  isL1SafeMasterCopy?: boolean
) {
  const ethAdapter = new EthersAdapter({
    ethers,
    signerOrProvider: provider
  })
  if (typeof safeAddressOrPredictedSafe === 'string') {
    return await Safe.create({
      ethAdapter,
      safeAddress: safeAddressOrPredictedSafe,
      isL1SafeMasterCopy
    })
  } else {
    return await Safe.create({
      ethAdapter,
      predictedSafe: safeAddressOrPredictedSafe,
      isL1SafeMasterCopy
    })
  }
}

export async function deploySafeAccount(
  signer: Signer,
  threshold: number,
  owners: string[],
  saltNonce: number,
  safeAddress?: string
) {
  const ethAdapter = new EthersAdapter({
    ethers,
    signerOrProvider: signer
  })
  const safeFactory = await SafeFactory.create({ ethAdapter })

  const safeAccountConfig: SafeAccountConfig = {
    owners,
    threshold
  }

  const safe = await safeFactory.deploySafe({
    safeAccountConfig,
    saltNonce: saltNonce.toString()
  })

  // check that the safe account address matches the expected address
  assert(!safeAddress || (await safe.getAddress()) === safeAddress)

  return safe
}

export async function getSafeAccountAddress(
  network: INetwork,
  wallet: IWallet,
  subWallet: ISubWallet
) {
  assert(network.kind === NetworkKind.EVM)
  assert(isMultisigWallet(wallet))
  const safe = subWallet.info.safe
  assert(safe)

  const cfg: PredictedSafeProps = {
    safeAccountConfig: {
      owners: safe.owners.map((owner) => owner.address),
      threshold: safe.threshold,
      ...safe.setupConfig
    },
    safeDeploymentConfig: {
      saltNonce: safe.saltNonce,
      safeVersion: safe.safeVersion
    }
  }

  const provider = await EvmClient.from(network)
  const safeAccount = await getSafeAccount(
    provider,
    cfg,
    safe.isL1SafeMasterCopy
  )
  return await safeAccount.getAddress()
}

export function isSafeInfoComplete(safe: SafeInfo) {
  return !!safe.saltNonce
}

export async function makeSafeAccount(
  network: INetwork,
  wallet: IWallet,
  subWallet: ISubWallet
) {
  assert(isMultisigWallet(wallet))
  assert(network.kind === NetworkKind.EVM)
  const safe = subWallet.info.safe
  assert(safe)

  const accountInfo = subWallet.info.accounts?.[network.kind]
  let address
  if (accountInfo?.chainId === network.chainId) {
    // for created or imported Safe Account on the same network
    address = accountInfo.address
  } else if (isSafeInfoComplete(safe)) {
    // for created or imported (with complete creation info) Safe Account on the different network
    address = await getSafeAccountAddress(network, wallet, subWallet)
  } else {
    // for imported Safe Account on the different network without complete creation info,
    // we cannot make a new Safe Account
    return {}
  }

  return {
    address,
    safe
  }
}

export type SafeTransactionResponse =
  | SafeModuleTransactionWithTransfersResponse
  | SafeMultisigTransactionWithTransfersResponse
  | EthereumTxWithTransfersResponse

export function getSafeTxHash(tx: SafeTransactionResponse) {
  switch (tx.txType) {
    case 'MULTISIG_TRANSACTION':
      return tx.transactionHash
    case 'MODULE_TRANSACTION':
      return tx.transactionHash
    case 'ETHEREUM_TRANSACTION':
      return tx.txHash
    default:
      // should not happen
      return undefined
  }
}

export class SafeApiKit extends _SafeApiKit {
  #txServiceBaseUrl: string
  #ethAdapter: EthAdapter

  constructor({ txServiceUrl, ethAdapter }: SafeApiKitConfig) {
    super({ txServiceUrl, ethAdapter })
    this.#txServiceBaseUrl = getTxServiceBaseUrl(txServiceUrl)
    this.#ethAdapter = ethAdapter
  }

  async getPendingTransactions(
    safeAddress: string,
    currentNonce?: number,
    options?: { limit?: number; offset?: number }
  ): Promise<SafeMultisigTransactionListResponse> {
    if (safeAddress === '') {
      throw new Error('Invalid Safe address')
    }
    const { address } = await this.#ethAdapter.getEip3770Address(safeAddress)
    const nonce = currentNonce
      ? currentNonce
      : (await this.getSafeInfo(address)).nonce

    const url = new URL(
      `${
        this.#txServiceBaseUrl
      }/v1/safes/${address}/multisig-transactions/?executed=false&nonce__gte=${nonce}`
    )

    if (typeof options?.limit === 'number') {
      url.searchParams.set('limit', options.limit.toString())
    }

    if (typeof options?.offset === 'number') {
      url.searchParams.set('offset', options.offset.toString())
    }

    return sendRequest({
      url: url.toString(),
      method: HttpMethod.Get
    })
  }

  async getAllTransactions(
    safeAddress: string,
    options?: AllTransactionsOptions & { limit?: number; offset?: number }
  ): Promise<AllTransactionsListResponse> {
    if (safeAddress === '') {
      throw new Error('Invalid Safe address')
    }
    const { address } = await this.#ethAdapter.getEip3770Address(safeAddress)
    const url = new URL(
      `${this.#txServiceBaseUrl}/v1/safes/${address}/all-transactions/`
    )

    const trusted = options?.trusted?.toString() || 'true'
    url.searchParams.set('trusted', trusted)

    const queued = options?.queued?.toString() || 'true'
    url.searchParams.set('queued', queued)

    const executed = options?.executed?.toString() || 'false'
    url.searchParams.set('executed', executed)

    if (typeof options?.limit === 'number') {
      url.searchParams.set('limit', options.limit.toString())
    }

    if (typeof options?.offset === 'number') {
      url.searchParams.set('offset', options.offset.toString())
    }

    return sendRequest({
      url: url.toString(),
      method: HttpMethod.Get
    })
  }
}

function getTxServiceBaseUrl(txServiceUrl: string): string {
  return `${txServiceUrl}/api`
}

enum HttpMethod {
  Get = 'get',
  Post = 'post',
  Delete = 'delete'
}

interface HttpRequest {
  url: string
  method: HttpMethod
  body?: any
}

async function sendRequest<T>({ url, method, body }: HttpRequest): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  let jsonResponse: any
  try {
    jsonResponse = await response.json()
  } catch (error) {
    if (!response.ok) {
      throw new Error(response.statusText)
    }
  }

  if (response.ok) {
    return jsonResponse as T
  }
  if (jsonResponse.data) {
    throw new Error(jsonResponse.data)
  }
  if (jsonResponse.detail) {
    throw new Error(jsonResponse.detail)
  }
  if (jsonResponse.message) {
    throw new Error(jsonResponse.message)
  }
  if (jsonResponse.nonFieldErrors) {
    throw new Error(jsonResponse.nonFieldErrors)
  }
  if (jsonResponse.delegate) {
    throw new Error(jsonResponse.delegate)
  }
  if (jsonResponse.safe) {
    throw new Error(jsonResponse.safe)
  }
  if (jsonResponse.delegator) {
    throw new Error(jsonResponse.delegator)
  }
  throw new Error(response.statusText)
}
