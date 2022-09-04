// https://ipfs.github.io/public-gateway-checker
import { toUtf8String } from '@ethersproject/strings'
import fs from 'fs'

import { fetchDataWithCache, fetchJsonWithCache } from '~lib/fetch'

class IpfsGatewayApi {
  async getGateways(): Promise<string[]> {
    let data
    try {
      data = await fetchDataWithCache(
        'https://github.com/ipfs/public-gateway-checker/raw/master/src/gateways.json',
        1000 * 3600 * 24 * 7
      )
    } catch {
      data = fs.readFileSync(__dirname + '/gateways.json')
    }

    return JSON.parse(toUtf8String(data))
  }

  async pickBestGateways(): Promise<string[]> {
    // TODO: validate and pick
    return [
      'https://cloudflare-ipfs.com/ipfs/:hash',
      'https://nftstorage.link/ipfs/:hash',
      'https://ipfs.io/ipfs/:hash',
      'https://dweb.link/ipfs/:hash'
    ]
  }

  async buildUrl(hash: string) {
    const gateways = await this.pickBestGateways()
    return gateways[0].replace(':hash', hash)
  }

  async fetch(hash: string, json = false): Promise<any | undefined> {
    const gateways = await this.pickBestGateways()
    for (const url of gateways) {
      try {
        const fetch = json ? fetchJsonWithCache : fetchDataWithCache
        return await fetch(
          url.replace(':hash', hash),
          1000 * 3600 * 24 * 365 * 100 // 100 years
        )
      } catch {}
    }
    return undefined
  }
}

export const IPFS_GATEWAY_API = new IpfsGatewayApi()
