// https://github.com/chainapsis/keplr-chain-registry
import {
  NonRecognizableChainFeatures,
  checkRPCConnectivity,
  checkRestConnectivity,
  validateBasicChainInfoType
} from '@keplr-wallet/chain-validator'
import { DenomHelper, sortedJsonByKeyStringify } from '@keplr-wallet/common'
import { ChainIdHelper } from '@keplr-wallet/cosmos'
import type { ChainInfo } from '@keplr-wallet/types'

export const validateCosmChainInfo = async (
  chainInfo: ChainInfo
): Promise<ChainInfo> => {
  chainInfo = await validateChainInfo(chainInfo)

  const chainIdentifier = ChainIdHelper.parse(chainInfo.chainId).identifier

  const isNativeSupported = (() => {
    const nativeChains: string[] = [
      'cosmoshub',
      'osmosis',
      'juno',
      'agoric',
      'akashnet',
      'axelar-dojo',
      'bostrom',
      'core',
      'emoney',
      'evmos_9001',
      'gravity-bridge',
      'ixo',
      'iov-mainnet-ibc',
      'irishub',
      'kava_2222',
      'regen',
      'secret',
      'sentinelhub',
      'shentu-2.2',
      'sifchain',
      'sommelier',
      'stargaze',
      'stride',
      'tgrade-mainnet',
      'umee',
      'crypto-org-chain-mainnet',
      'quicksilver',
      'columbus',
      'phoenix'
    ]
    return nativeChains.map((s) => s.trim()).includes(chainIdentifier)
  })()
  if (!isNativeSupported && !chainInfo.nodeProvider) {
    throw new Error('Node provider should be provided')
  }

  if (!isNativeSupported && !chainInfo.chainSymbolImageUrl) {
    throw new Error('chainSymbolImageUrl should be provided')
  }

  if (
    chainInfo.bip44.coinType === 60 &&
    (!chainInfo.features?.includes('eth-address-gen') ||
      !chainInfo.features?.includes('eth-key-sign'))
  ) {
    throw new Error(
      'EVM Chain should add eth-address-gen, eth-key-sign features'
    )
  }

  const validateImageUrl = (url: string): string => {
    const baseURL = `https://raw.githubusercontent.com/chainapsis/keplr-chain-registry/main/images/${chainIdentifier}/`

    if (!url.startsWith(baseURL)) {
      throw new Error(`Invalid image url: ${url}`)
    }
    if (!url.endsWith('.png')) {
      throw new Error(`Image is not png: ${url}`)
    }

    return url.replace(baseURL, '')
  }

  if (chainInfo.chainSymbolImageUrl) {
    validateImageUrl(chainInfo.chainSymbolImageUrl)
  }
  if (chainInfo.stakeCurrency.coinImageUrl) {
    validateImageUrl(chainInfo.stakeCurrency.coinImageUrl)
  }
  for (const currency of chainInfo.currencies) {
    if (currency.coinImageUrl) {
      validateImageUrl(currency.coinImageUrl)
    }
  }
  for (const feeCurrency of chainInfo.feeCurrencies) {
    if (feeCurrency.coinImageUrl) {
      validateImageUrl(feeCurrency.coinImageUrl)
    }
  }

  return chainInfo
}

export const validateChainInfo = async (
  chainInfo: ChainInfo
): Promise<ChainInfo> => {
  const prev = sortedJsonByKeyStringify(chainInfo)

  // validate chain information
  chainInfo = await validateBasicChainInfoType(chainInfo)

  if (sortedJsonByKeyStringify(chainInfo) !== prev) {
    throw new Error('Chain info has unknown field')
  }

  const chainIdentifier = ChainIdHelper.parse(chainInfo.chainId).identifier

  for (const feature of chainInfo.features ?? []) {
    if (!NonRecognizableChainFeatures.includes(feature)) {
      throw new Error(
        `Only non recognizable feature should be provided: ${feature}`
      )
    }
  }

  for (const currency of chainInfo.currencies) {
    if (new DenomHelper(currency.coinMinimalDenom).type !== 'native') {
      throw new Error(
        `Do not provide not native token to currencies: ${currency.coinMinimalDenom}`
      )
    }

    if (currency.coinMinimalDenom.startsWith('ibc/')) {
      throw new Error(
        `Do not provide ibc currency to currencies: ${currency.coinMinimalDenom}`
      )
    }

    if (currency.coinMinimalDenom.startsWith('gravity0x')) {
      throw new Error(
        `Do not provide bridged currency to currencies: ${currency.coinMinimalDenom}`
      )
    }
  }

  if (chainInfo.features?.includes('stargate')) {
    throw new Error("'stargate' feature is deprecated")
  }

  if (chainInfo.features?.includes('no-legacy-stdTx')) {
    throw new Error("'no-legacy-stdTx' feature is deprecated")
  }

  if (chainInfo.beta != null) {
    throw new Error("Should not set 'beta' field")
  }

  // check RPC alive
  await checkRPCConnectivity(
    chainInfo.chainId,
    chainInfo.rpc,
    (url) => new WebSocket(url)
  )

  // check REST alive
  if (chainIdentifier !== 'gravity-bridge' && chainIdentifier !== 'sommelier') {
    await checkRestConnectivity(chainInfo.chainId, chainInfo.rest)
  }

  return chainInfo
}
