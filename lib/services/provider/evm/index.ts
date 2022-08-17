import { BigNumber } from '@ethersproject/bignumber'
import { hexlify } from '@ethersproject/bytes'
import { Logger } from '@ethersproject/logger'
import { Network } from '@ethersproject/networks'
import { resolveProperties } from '@ethersproject/properties'
import {
  UrlJsonRpcProvider as BaseUrlJsonRpcProvider,
  BlockTag
} from '@ethersproject/providers'
import { version } from '@ethersproject/providers/lib/_version'
import { ConnectionInfo } from '@ethersproject/web'

import { EvmChainInfo } from '~lib/network/evm'
import { INetwork, IWalletInfo } from '~lib/schema'
import { ProviderAdaptor } from '~lib/services/provider/types'
import {
  TRANSACTION_SERVICE,
  TransactionRequest
} from '~lib/services/transactionService'
import { getSigningWallet } from '~lib/wallet'

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
            hexlify(params.numberOfBlocks),
            hexlify(params.endBlockNumber),
            params.percentiles
          ]
        ]
      default:
        return super.prepareRequest(method, params)
    }
  }
}

export class EvmProvider extends UrlJsonRpcProvider {
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
}

export class EvmProviderWithSigner extends EvmProvider {
  constructor(private net: INetwork, private wallet: IWalletInfo) {
    super(net)
  }

  send(method: string, params: Array<any>): Promise<any> {
    switch (method) {
      case 'sendTransaction':
        return TRANSACTION_SERVICE.requestTransaction({
          networkId: this.net.id,
          walletInfoId: this.wallet.id,
          payload: params[0]
        } as TransactionRequest)
    }

    return super.send(method, params)
  }
}

export class EvmProviderAdaptor implements ProviderAdaptor {
  provider: EvmProvider

  constructor(network: INetwork) {
    this.provider = new EvmProvider(network)
  }

  async getBalance(address: string): Promise<string> {
    const balance = await this.provider.getBalance(address)
    return balance.toString()
  }

  async getTransactions(address: string): Promise<any> {
    // TODO
    return
  }

  async signTransaction(wallet: IWalletInfo, transaction: any): Promise<any> {
    const signer = await getSigningWallet(wallet)
    return signer.signTransaction(transaction)
  }

  async sendTransaction(signedTransaction: any): Promise<any> {
    return this.provider.sendTransaction(signedTransaction)
  }
}
