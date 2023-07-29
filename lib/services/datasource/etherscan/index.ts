import { Interface } from '@ethersproject/abi'
import { TransactionResponse } from '@ethersproject/abstract-provider'
import { Logger } from '@ethersproject/logger'
import { Network } from '@ethersproject/networks'
import { EtherscanProvider } from '@ethersproject/providers'
import { version } from '@ethersproject/providers/lib/_version'
import { ConnectionInfo } from '@ethersproject/web'
import assert from 'assert'
import { useMemo } from 'react'

import { fetchJson, fetchJsonWithCache } from '~lib/fetch'
import { EvmChainInfo } from '~lib/network/evm'
import { INetwork } from '~lib/schema'

const logger = new Logger(version)

function getResult(result: {
  status?: number
  message?: string
  result?: any
}): any {
  // getLogs, getHistory have weird success responses
  if (
    result.status == 0 &&
    (result.message === 'No records found' ||
      result.message === 'No transactions found')
  ) {
    return result.result
  }

  if (result.status != 1 || !result.message?.startsWith('OK')) {
    const error: any = new Error('invalid response')
    error.result = JSON.stringify(result)
    if ((result.result || '').toLowerCase().indexOf('rate limit') >= 0) {
      error.throttleRetry = true
    }
    throw error
  }

  return result.result
}

function getJsonResult(result: {
  jsonrpc: string
  result?: any
  error?: { code?: number; data?: any; message?: string }
}): any {
  // This response indicates we are being throttled
  if (
    result &&
    (result as any).status == 0 &&
    (result as any).message == 'NOTOK' &&
    (result.result || '').toLowerCase().indexOf('rate limit') >= 0
  ) {
    const error: any = new Error('throttled response')
    error.result = JSON.stringify(result)
    error.throttleRetry = true
    throw error
  }

  if (result.jsonrpc != '2.0') {
    // @TODO: not any
    const error: any = new Error('invalid response')
    error.result = JSON.stringify(result)
    throw error
  }

  if (result.error) {
    // @TODO: not any
    const error: any = new Error(result.error.message || 'unknown error')
    if (result.error.code) {
      error.code = result.error.code
    }
    if (result.error.data) {
      error.data = result.error.data
    }
    throw error
  }

  return result.result
}

export interface EtherscanTxResponse {
  blockNumber: number
  transactionIndex: number
  txreceipt_status: string
  methodId: string
  functionName: string
}

export enum EvmTxType {
  NORMAL = '',
  INTERNAL = 'internal',
  ERC20 = 'erc20',
  ERC721 = 'erc721',
  ERC1155 = 'erc1155',
  UserOp = 'userOperation' // for erc4337
}

function getAction(type: EvmTxType) {
  switch (type) {
    case EvmTxType.NORMAL:
      return 'txlist'
    case EvmTxType.INTERNAL:
      return 'txlistinternal'
    case EvmTxType.ERC20:
      return 'tokentx'
    case EvmTxType.ERC721:
      return 'tokennfttx'
    case EvmTxType.ERC1155:
      return 'token1155tx'
  }
}

class CachedEtherscanProvider extends EtherscanProvider {
  private static chainBaseUrls: Map<number, string> = new Map([
    [1, 'https://api.etherscan.io'],
    [3, 'https://api-ropsten.etherscan.io'],
    [4, 'https://api-rinkeby.etherscan.io'],
    [5, 'https://api-goerli.etherscan.io'],
    [11155111, 'https://api-sepolia.etherscan.io'],
    [10, 'https://api-optimistic.etherscan.io'],
    [42161, 'https://api.arbiscan.io'],
    [43114, 'https://api.snowtrace.io'],
    [56, 'https://api.bscscan.com'],
    [137, 'https://api.polygonscan.com/'],
    [250, 'https://api.ftmscan.com/'],
    [1284, 'https://api-moonbeam.moonscan.io'],
    [1285, 'https://api-moonriver.moonscan.io'],
    [25, 'https://api.cronoscan.com'],
    [1313161554, 'https://api.aurorascan.dev'],
    [42220, 'https://api.celoscan.io'],
    [100, 'https://api.gnosisscan.io'],
    [288, 'https://api.bobascan.com']
  ])

  constructor(network: INetwork) {
    const info = network.info as EvmChainInfo
    super({
      name: info.name,
      chainId: +network.chainId,
      ensAddress: info.ens?.registry
    } as Network)
  }

  getBaseUrl(): string {
    const chainId = this.network.chainId
    const baseUrl = CachedEtherscanProvider.chainBaseUrls.get(chainId)
    if (baseUrl) {
      return baseUrl
    }
    return logger.throwArgumentError(
      'unsupported network',
      'network',
      this.network.name
    )
  }

  getUrlWithoutApiKey(module: string, params: Record<string, string>): string {
    const url = super.getUrl(module, params)
    const u = new URL(url)
    u.searchParams.delete('apikey')
    return u.toString()
  }

  async fetch(
    module: string,
    params: Record<string, any>,
    post?: boolean
  ): Promise<any> {
    let url = post ? this.getPostUrl() : this.getUrl(module, params)

    const _fetch = async () => {
      const payload = post ? this.getPostData(module, params) : null
      const procFunc = module === 'proxy' ? getJsonResult : getResult

      const connection: ConnectionInfo = {
        url: url,
        throttleSlotInterval: 1000,
        throttleCallback: (attempt: number, url: string) => {
          return Promise.resolve(true)
        }
      }

      let payloadStr: string | null = null
      if (payload) {
        connection.headers = {
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
        }
        payloadStr = Object.keys(payload)
          .map((key) => {
            return `${key}=${payload[key]}`
          })
          .join('&')
      }

      if (payloadStr) {
        return await fetchJson(
          connection,
          payloadStr,
          procFunc || getJsonResult
        )
      } else {
        return await fetchJsonWithCache(
          connection,
          1000 * 10,
          procFunc || getJsonResult
        )
      }
    }

    try {
      return await _fetch()
    } catch (err: any) {
      if (err.toString().includes('Invalid API Key')) {
        url = this.getUrlWithoutApiKey(module, params)
        return await _fetch()
      } else {
        throw err
      }
    }
  }

  async getBlockCountdown() {}

  async getAbi(addressOrName: string): Promise<Interface> {
    const params = {
      action: 'getabi',
      address: await this.resolveName(addressOrName)
    }

    const result = await this.fetch('contract', params)
    return new Interface(JSON.parse(result))
  }

  async getTransactions(
    type: EvmTxType,
    addressOrName: string,
    startblock?: number
  ): Promise<Array<[TransactionResponse, EtherscanTxResponse]>> {
    const action = getAction(type)
    assert(action)
    const params = {
      action,
      address: await this.resolveName(addressOrName),
      startblock,
      endblock: 99999999,
      sort: 'desc'
    }

    const result = await this.fetch('account', params)

    return (
      result.map((tx: any) => {
        ;['contractAddress', 'to'].forEach(function (key) {
          if (tx[key] == '') {
            delete tx[key]
          }
        })

        if (tx.creates == null && tx.contractAddress != null) {
          tx.creates = tx.contractAddress
        }

        const item = this.formatter.transactionResponse(tx)
        if (tx.timeStamp) {
          item.timestamp = parseInt(tx.timeStamp)
        }

        tx.blockNumber = +tx.blockNumber

        if (tx.transactionIndex) {
          tx.transactionIndex = +tx.transactionIndex
        } else {
          // TODO: deduplicate
          tx.transactionIndex = -1
        }

        return [item, tx]
      }) as Array<[TransactionResponse, EtherscanTxResponse]>
    ).sort((a, b) => {
      // sort by blockNumber desc, transactionIndex desc
      const { blockNumber: aBlock, transactionIndex: aIndex } = a[1]
      const { blockNumber: bBlock, transactionIndex: bIndex } = b[1]
      if (aBlock > bBlock) {
        return -1
      } else if (aBlock < bBlock) {
        return 1
      } else if (aIndex > bIndex) {
        return -1
      } else if (aIndex < bIndex) {
        return 1
      } else {
        return 0
      }
    })
  }
}

class EtherScanApi {
  getProvider(network: INetwork): CachedEtherscanProvider | undefined {
    try {
      return new CachedEtherscanProvider(network)
    } catch (e: any) {
      if (e.toString().includes('unsupported network')) {
        return undefined
      }
      throw e
    }
  }
}

export const ETHERSCAN_API = new EtherScanApi()

export function useEtherScanProvider(network?: INetwork) {
  return useMemo(() => {
    if (!network) {
      return
    }
    return ETHERSCAN_API.getProvider(network)
  }, [network])
}
