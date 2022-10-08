import { FunctionFragment } from '@ethersproject/abi'
import { VoidSigner } from '@ethersproject/abstract-signer'
import { BigNumber } from '@ethersproject/bignumber'
import { BytesLike, hexValue, hexlify } from '@ethersproject/bytes'
import { _TypedDataEncoder } from '@ethersproject/hash'
import { Logger } from '@ethersproject/logger'
import { Network } from '@ethersproject/networks'
import { resolveProperties, shallowCopy } from '@ethersproject/properties'
import {
  UrlJsonRpcProvider as BaseUrlJsonRpcProvider,
  BlockTag
} from '@ethersproject/providers'
import { version } from '@ethersproject/providers/lib/_version'
import { ConnectionInfo } from '@ethersproject/web'
import assert from 'assert'
import { ethErrors } from 'eth-rpc-errors'
import { useCallback, useMemo } from 'react'
import { useAsync } from 'react-use'

import { NetworkKind } from '~lib/network'
import { EvmChainInfo } from '~lib/network/evm'
import { IChainAccount, INetwork } from '~lib/schema'
import { useEvmSignatureFrom4Bytes } from '~lib/services/datasource/4byte'
import { ETH_BALANCE_CHECKER_API } from '~lib/services/datasource/ethBalanceChecker'
import { IPFS_GATEWAY_API } from '~lib/services/datasource/ipfsGateway'
import { NETWORK_SERVICE } from '~lib/services/network'
import {
  GasOption,
  MaxFeePerGas,
  fetchGasFeeEstimates
} from '~lib/services/provider/evm/gasFee'
import {
  ProviderAdaptor,
  TransactionPayload
} from '~lib/services/provider/types'
import { EVM_TRANSACTION_SERVICE } from '~lib/services/transaction/evm'
import { StoreKey, useLocalStorage } from '~lib/store'
import { getSigningWallet } from '~lib/wallet'

import { reduceTypes } from './typedData'
import {
  EvmTxParams,
  EvmTxPopulatedParams,
  allowedTransactionKeys
} from './types'

export * from './types'
export * from './gasFee'

const logger = new Logger(version)

export type EthFeeHistoryResponse = {
  oldestBlock: number
  baseFeePerGas?: BigNumber[]
  gasUsedRatio: number[]
  reward?: BigNumber[][]
}

class UrlJsonRpcProvider extends BaseUrlJsonRpcProvider {
  async getFeeHistory(
    numberOfBlocks: number,
    endBlockTag: BlockTag | Promise<BlockTag>,
    percentiles: number[]
  ): Promise<EthFeeHistoryResponse> {
    await this.getNetwork()

    const params = await resolveProperties({
      numberOfBlocks,
      endBlockTag: this._getBlockTag(endBlockTag),
      percentiles
    })

    const result = await this.perform('getFeeHistory', params)
    try {
      return {
        oldestBlock: BigNumber.from(result.oldestBlock).toNumber(),
        baseFeePerGas: result.baseFeePerGas?.map((f: string) =>
          BigNumber.from(f)
        ),
        gasUsedRatio: result.gasUsedRatio,
        reward: result.reward?.map((reward: string[]) =>
          reward.map((r: string) => BigNumber.from(r))
        )
      } as EthFeeHistoryResponse
    } catch (error) {
      return logger.throwError(
        'bad result from backend',
        Logger.errors.SERVER_ERROR,
        {
          method: 'getFeeHistory',
          params,
          result,
          error
        }
      )
    }
  }

  prepareRequest(method: string, params: any): [string, Array<any>] {
    switch (method) {
      case 'getFeeHistory':
        return [
          'eth_feeHistory',
          [
            hexValue(params.numberOfBlocks),
            params.endBlockTag,
            params.percentiles
          ]
        ]
      default:
        return super.prepareRequest(method, params)
    }
  }
}

export class EvmProvider extends UrlJsonRpcProvider {
  private static providers = new Map<number, EvmProvider>()

  static async from(
    network: INetwork | number | 'Ethereum Mainnet'
  ): Promise<EvmProvider> {
    if (typeof network !== 'object') {
      const net = await NETWORK_SERVICE.getNetwork({
        kind: NetworkKind.EVM,
        chainId: network === 'Ethereum Mainnet' ? 1 : network
      })
      assert(net)
      network = net
    }

    const info = network.info as EvmChainInfo
    const cached = await EvmProvider.providers.get(+network.chainId)
    if (cached) {
      const net = (await cached.getNetwork()) as Network & {
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

    const provider = new EvmProvider(network)
    EvmProvider.providers.set(+network.chainId, provider)
    return provider
  }

  constructor(network: INetwork) {
    const info = network.info as EvmChainInfo
    super({
      name: info.name,
      chainId: +network.chainId,
      ensAddress: info.ens?.registry,
      rpcUrls: info.rpc // extra field
    } as Network)
  }

  static getUrl(network: Network, apiKey: any): ConnectionInfo {
    const rpcUrls: string[] = (network as any).rpcUrls
    if (!rpcUrls?.length) {
      throw new Error('empty evm rpc urls')
    }
    return { url: rpcUrls[0], allowGzip: true } as ConnectionInfo
  }

  async resolveUrl(url: string): Promise<string | undefined> {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      return url
    } else {
      let ipfsHash
      if (!url.startsWith('ipfs://') && url.endsWith('.eth')) {
        const resolver = await this.getResolver(url)
        if (!resolver) {
          return undefined
        }
        ipfsHash = await resolver.getContentHash()
        if (!ipfsHash) {
          return undefined
        }
      } else {
        ipfsHash = url
      }

      if (ipfsHash.startsWith('ipfs://')) {
        ipfsHash = ipfsHash.slice('ipfs://'.length)
      }

      return IPFS_GATEWAY_API.buildUrl(ipfsHash)
    }
  }

  async getBlockInterval(): Promise<number> {
    const thisBlock = await this.getBlock('latest')
    const lastBlock = await this.getBlock(thisBlock.number - 1)
    return thisBlock.timestamp - lastBlock.timestamp // seconds
  }
}

export class EvmProviderAdaptor implements ProviderAdaptor {
  constructor(public provider: EvmProvider) {}

  static async from(network: INetwork): Promise<EvmProviderAdaptor> {
    const provider = await EvmProvider.from(network)
    return new EvmProviderAdaptor(provider)
  }

  async isOk(): Promise<boolean> {
    try {
      await this.provider.getBlockNumber()
      return true
    } catch (err) {
      console.error(err)
      return false
    }
  }

  async isContract(address: string): Promise<boolean> {
    try {
      const code = await this.provider.getCode(address)
      if (code && code !== '0x') return true
    } catch {}
    return false
  }

  async getBalance(address: string): Promise<string> {
    const balance = await this.provider.getBalance(address)
    return balance.toString()
  }

  async getBalances(addresses: string[]): Promise<string[] | undefined> {
    const balances = await ETH_BALANCE_CHECKER_API.getAddressesBalances(
      this.provider,
      addresses
    )
    if (!balances) {
      return
    }
    const result = balances.map(
      (item) => item[ETH_BALANCE_CHECKER_API.NATIVE_TOKEN]
    )
    if (result.some((item) => !item)) {
      return
    }
    return result
  }

  async getTransactions(address: string): Promise<any> {
    // TODO
    return
  }

  async estimateGasPrice(): Promise<any> {
    return fetchGasFeeEstimates(this.provider)
  }

  async estimateSendGas(account: IChainAccount, to: string): Promise<string> {
    const voidSigner = new VoidSigner(account.address!, this.provider)
    const gas = await voidSigner.estimateGas({ to, value: 0 })
    return gas.toString()
  }

  async estimateGas(account: IChainAccount, tx: any): Promise<string> {
    const voidSigner = new VoidSigner(account.address!, this.provider)

    const estimateGas = async (tx: any) => {
      return await voidSigner.estimateGas(tx).catch((error) => {
        if (forwardErrors.indexOf(error.code) >= 0) {
          throw error
        }

        return logger.throwError(
          'cannot estimate gas; transaction may fail or may require manual gas limit',
          Logger.errors.UNPREDICTABLE_GAS_LIMIT,
          {
            error: error,
            tx: tx
          }
        )
      })
    }

    try {
      return (await estimateGas(tx)).toString()
    } catch (error: any) {
      if (
        error.code === Logger.errors.INSUFFICIENT_FUNDS &&
        tx.value &&
        BigNumber.from(tx.value).gt(0) &&
        !tx.data?.length
      ) {
        // retry without value
        const txCopy = shallowCopy(tx)
        delete txCopy.value
        return (await estimateGas(txCopy)).toString()
      } else {
        throw error
      }
    }
  }

  async populateTransaction(
    account: IChainAccount,
    transaction: EvmTxParams
  ): Promise<TransactionPayload> {
    const signer = new VoidSigner(account.address!, this.provider)

    for (const key in transaction) {
      if (allowedTransactionKeys.indexOf(key) === -1) {
        logger.throwArgumentError(
          'invalid transaction key: ' + key,
          'transaction',
          transaction
        )
      }
    }

    const tx = shallowCopy(transaction)

    const from = await signer.getAddress()
    if (!tx.from) {
      tx.from = from
    } else {
      // Make sure any provided address matches this signer
      if (tx.from.toLowerCase() !== from.toLowerCase()) {
        logger.throwArgumentError(
          'from address mismatch',
          'transaction',
          transaction
        )
      }
    }

    if (tx.to != null) {
      const to = await signer.resolveName(tx.to)
      if (!to) {
        logger.throwArgumentError(
          'provided ENS name resolves to null',
          'tx.to',
          to
        )
      }
      tx.to = to
    }

    // Do not allow mixing pre-eip-1559 and eip-1559 properties
    const hasEip1559 =
      tx.maxFeePerGas != null || tx.maxPriorityFeePerGas != null
    if (tx.gasPrice != null && (tx.type === 2 || hasEip1559)) {
      logger.throwArgumentError(
        'eip-1559 transaction do not support gasPrice',
        'transaction',
        transaction
      )
    } else if ((tx.type === 0 || tx.type === 1) && hasEip1559) {
      logger.throwArgumentError(
        'pre-eip-1559 transaction do not support maxFeePerGas/maxPriorityFeePerGas',
        'transaction',
        transaction
      )
    }

    const populatedParams: EvmTxPopulatedParams = {}

    if (
      (tx.type === 2 || tx.type == null) &&
      tx.maxFeePerGas != null &&
      tx.maxPriorityFeePerGas != null
    ) {
      // Fully-formed EIP-1559 transaction (skip getFeeData)
      tx.type = 2
    } else if (tx.type === 0 || tx.type === 1) {
      // Explicit Legacy or EIP-2930 transaction

      // Populate missing gasPrice
      if (tx.gasPrice == null) {
        populatedParams.gasPrice = await signer.getGasPrice()
      }
    } else {
      // We need to get fee data to determine things
      const feeData = await signer.getFeeData()

      if (tx.type == null) {
        // We need to auto-detect the intended type of this transaction...

        if (
          feeData.maxFeePerGas != null &&
          feeData.maxPriorityFeePerGas != null
        ) {
          // The network supports EIP-1559!

          // Upgrade transaction from null to eip-1559
          tx.type = 2

          if (tx.gasPrice != null) {
            // Using legacy gasPrice property on an eip-1559 network,
            // so use gasPrice as both fee properties
            const gasPrice = tx.gasPrice
            delete tx.gasPrice
            tx.maxFeePerGas = gasPrice
            tx.maxPriorityFeePerGas = gasPrice
          } else {
            // Populate missing fee data
            if (tx.maxFeePerGas == null) {
              populatedParams.maxFeePerGas = feeData.maxFeePerGas
            }
            if (tx.maxPriorityFeePerGas == null) {
              populatedParams.maxPriorityFeePerGas =
                feeData.maxPriorityFeePerGas
            }
          }
        } else if (feeData.gasPrice != null) {
          // Network doesn't support EIP-1559...

          // ...but they are trying to use EIP-1559 properties
          if (hasEip1559) {
            logger.throwError(
              'network does not support EIP-1559',
              Logger.errors.UNSUPPORTED_OPERATION,
              {
                operation: 'populateTransaction'
              }
            )
          }

          // Populate missing fee data
          if (tx.gasPrice == null) {
            populatedParams.gasPrice = feeData.gasPrice
          }

          // Explicitly set untyped transaction to legacy
          tx.type = 0
        } else {
          // getFeeData has failed us.
          logger.throwError(
            'failed to get consistent fee data',
            Logger.errors.UNSUPPORTED_OPERATION,
            {
              operation: 'signer.getFeeData'
            }
          )
        }
      } else if (tx.type === 2) {
        // Explicitly using EIP-1559

        // Populate missing fee data
        if (tx.maxFeePerGas == null) {
          populatedParams.maxFeePerGas = feeData.maxFeePerGas || undefined
        }
        if (tx.maxPriorityFeePerGas == null) {
          populatedParams.maxPriorityFeePerGas =
            feeData.maxPriorityFeePerGas || undefined
        }
      }
    }

    tx.nonce = await EVM_TRANSACTION_SERVICE.getNonce(account, signer)

    if ((tx as any).gas != null) {
      if (tx.gasLimit != null) {
        logger.throwArgumentError(
          'gas and gasLimit cannot be both specified',
          'transaction',
          transaction
        )
      }
      tx.gasLimit = (tx as any).gas
      delete (tx as any).gas
    }

    if (tx.gasLimit == null) {
      try {
        tx.gasLimit = await this.estimateGas(account, tx)
      } catch (error: any) {
        tx.gasLimit = 28500000
        if (forwardErrors.indexOf(error.code) >= 0) {
          populatedParams.code = error.code
        }
        populatedParams.error = error.toString()
      }
    }

    const chainId = +account.chainId
    if (tx.chainId == null) {
      tx.chainId = chainId
    } else {
      if (tx.chainId !== chainId) {
        logger.throwArgumentError(
          'chainId mismatch',
          'transaction',
          transaction
        )
      }
    }

    if (tx.data?.length === 0) {
      tx.data = undefined
    }

    return { txParams: tx, populatedParams } as TransactionPayload
  }

  async signTransaction(wallet: IChainAccount, transaction: any): Promise<any> {
    const signer = await getSigningWallet(wallet)
    if (!signer) {
      throw ethErrors.rpc.internal()
    }
    return signer.signTransaction(transaction)
  }

  async sendTransaction(signedTransaction: any): Promise<any> {
    return this.provider.sendTransaction(signedTransaction)
  }

  async signMessage(wallet: IChainAccount, message: any): Promise<any> {
    const signer = await getSigningWallet(wallet)
    if (!signer) {
      throw ethErrors.rpc.internal()
    }
    return signer.signMessage(message)
  }

  async getTypedData(typedData: any): Promise<any> {
    const { domain, types: originalTypes, primaryType, message } = typedData
    const types = reduceTypes(originalTypes, primaryType)
    const populated = await _TypedDataEncoder.resolveNames(
      domain,
      types,
      message,
      (name: string) => {
        return this.provider.resolveName(name) as Promise<string>
      }
    )
    typedData = _TypedDataEncoder.getPayload(
      populated.domain,
      types,
      populated.value
    )
    delete typedData.types.EIP712Domain
    if (primaryType != null && primaryType !== typedData.primaryType) {
      throw ethErrors.rpc.invalidParams('Invalid primaryType')
    }
    return typedData
  }

  async signTypedData(wallet: IChainAccount, typedData: any): Promise<any> {
    const signer = await getSigningWallet(wallet)
    if (!signer) {
      throw ethErrors.rpc.internal()
    }
    return signer.signTypedData(typedData)
  }
}

const forwardErrors = [
  Logger.errors.INSUFFICIENT_FUNDS,
  Logger.errors.NONCE_EXPIRED,
  Logger.errors.REPLACEMENT_UNDERPRICED
]

export function useEvmProvider(network?: INetwork) {
  const { value } = useAsync(async () => {
    if (!network) {
      return
    }
    return EvmProvider.from(network)
  }, [network])
  return value
}

export function useEvmFunctionSignature(
  data?: BytesLike
): FunctionFragment | undefined {
  const hex = data?.length ? hexlify(data) : undefined

  const sig = useEvmSignatureFrom4Bytes(hex?.slice(0, 10))

  return useMemo(() => {
    if (!sig) return

    try {
      return parseEvmFunctionSignature(sig)
    } catch {}
  }, [sig])
}

export function parseEvmFunctionSignature(sig: string) {
  return FunctionFragment.from(sig)
}

function gasFeeStoreKey(networkId: number): string {
  return `${StoreKey.GAS_FEE_PREFIX}_${networkId}`
}

type GasFeeSettings = {
  option: GasOption
  advanced?: MaxFeePerGas
}

export function useDefaultGasFeeSettings(networkId: number) {
  const [gasFeeSettings, setGasFeeSettings, { remove: removeGasFeeSettings }] =
    useLocalStorage<GasFeeSettings | undefined>(gasFeeStoreKey(networkId))

  const setDefaultGasFeeOption = useCallback(
    (option?: GasOption) => {
      if (
        option === GasOption.SITE_SUGGESTED ||
        option === GasOption.ADVANCED
      ) {
        return
      }
      if (!option) {
        removeGasFeeSettings()
      } else {
        setGasFeeSettings({
          option
        })
      }
    },
    [setGasFeeSettings, removeGasFeeSettings]
  )

  const setDefaultAdvancedGasFee = useCallback(
    (advanced: MaxFeePerGas) => {
      setGasFeeSettings({
        option: GasOption.ADVANCED,
        advanced
      })
    },
    [setGasFeeSettings]
  )

  return {
    defaultGasFeeOption: gasFeeSettings?.option,
    setDefaultGasFeeOption,
    defaultAdvancedGasFee: gasFeeSettings?.advanced,
    setDefaultAdvancedGasFee
  }
}
