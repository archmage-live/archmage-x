import { Provider } from '@ethersproject/abstract-provider'
import { Signer } from '@ethersproject/abstract-signer'
import SafeApiKit from '@safe-global/api-kit'
import Safe, {
  EthersAdapter,
  PredictedSafeProps,
  SafeAccountConfig,
  SafeFactory
} from '@safe-global/protocol-kit'
import assert from 'assert'
import { ethers } from 'ethers'

import { ChainId, INetwork, ISubWallet, IWallet } from '~lib/schema'
import { EvmClient } from '~lib/services/provider/evm'
import { isMultisigWallet } from '~lib/wallet'

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
  [42220, 'https://safe-transaction-celo.safe.global']
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
  safeAddressOrPredictedSafe: string | PredictedSafeProps
) {
  const ethAdapter = new EthersAdapter({
    ethers,
    signerOrProvider: provider
  })
  if (typeof safeAddressOrPredictedSafe === 'string') {
    return await Safe.create({
      ethAdapter,
      safeAddress: safeAddressOrPredictedSafe
    })
  } else {
    return await Safe.create({
      ethAdapter,
      predictedSafe: safeAddressOrPredictedSafe
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
  assert(isMultisigWallet(wallet.type))

  const safe = subWallet.info.safe!
  const cfg: PredictedSafeProps = {
    safeAccountConfig: {
      owners: safe.owners.map((owner) => owner.address),
      threshold: safe.threshold
    },
    safeDeploymentConfig: {
      saltNonce: safe.saltNonce.toString()
    }
  }

  const provider = await EvmClient.from(network)
  const safeAccount = await getSafeAccount(provider, cfg)
  return await safeAccount.getAddress()
}
