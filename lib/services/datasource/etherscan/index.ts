import { EtherscanProvider } from '@ethersproject/providers'
import { ConnectionInfo } from '@ethersproject/web'

import { fetchJson, fetchJsonWithCache } from '~lib/fetch'

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

  if (result.status != 1 || result.message != 'OK') {
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

class CachedEtherscanProvider extends EtherscanProvider {
  async fetch(
    module: string,
    params: Record<string, any>,
    post?: boolean
  ): Promise<any> {
    const url = post ? this.getPostUrl() : this.getUrl(module, params)
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
      return await fetchJson(connection, payloadStr, procFunc || getJsonResult)
    } else {
      return await fetchJsonWithCache(
        connection,
        1000 * 10,
        procFunc || getJsonResult
      )
    }
  }

  async getBlockCountdown() {
  }

  async getTransactions(addressOrName: string, offset?: number, limit?: number) {
    const params = {
      action: "txlist",
      address: (await this.resolveName(addressOrName)),
      startblock: 0,
      endblock: 99999999,
      sort: "desc",
      page: offset !== undefined ? offset + 1 : undefined,
      offset: limit !== undefined ? limit : undefined
    };

    const result = await this.fetch("account", params);

    return result.map((tx: any) => {
      ["contractAddress", "to"].forEach(function(key) {
        if (tx[key] == "") { delete tx[key]; }
      });
      if (tx.creates == null && tx.contractAddress != null) {
        tx.creates = tx.contractAddress;
      }
      const item = this.formatter.transactionResponse(tx);
      if (tx.timeStamp) { item.timestamp = parseInt(tx.timeStamp); }
      return item;
    });
  }
}

class EtherScanApi {
}

export const ETHERSCAN_API = new EtherScanApi()
