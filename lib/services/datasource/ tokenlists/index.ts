// https://tokenlists.org
// https://github.com/Uniswap/token-lists
// https://github.com/Uniswap/tokenlists-org
import { toUtf8String } from '@ethersproject/strings'
import { TokenList, schema } from '@uniswap/token-lists'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import fs from 'fs'

import { fetchDataWithCache, fetchJsonWithCache } from '~lib/fetch'
import { IPFS_GATEWAY_API } from '~lib/services/datasource/ipfsGateway'
import { EvmProvider } from '~lib/services/provider/evm'

class TokenListsApi {
  private async _getTokenLists(): Promise<Map<string, string>> {
    let data
    try {
      data = await fetchDataWithCache(
        'https://github.com/Uniswap/tokenlists-org/raw/master/src/token-lists.json',
        1000 * 3600 * 24 * 7
      )
    } catch {
      data = fs.readFileSync(__dirname + '/token-lists.json')
    }

    const tokenLists: Record<string, { name: string; homepage: string }> =
      JSON.parse(toUtf8String(data))
    return new Map(
      Object.entries(tokenLists).map(([url, { name }]) => [name, url])
    )
  }

  async getTokenLists(): Promise<Map<string, TokenList>> {
    const provider = await EvmProvider.from('Ethereum Mainnet')

    const tokenLists = await this._getTokenLists()

    const ajv = new Ajv()
    addFormats(ajv)

    const result = new Map<string, TokenList>()
    for (const [name, url] of tokenLists) {
      let tokenList
      if (url.startsWith('https://') || url.startsWith('http://')) {
        tokenList = await fetchJsonWithCache(url, 1000 * 3600 * 24 * 7)
      } else {
        const resolver = await provider.getResolver(url)
        if (!resolver) {
          continue
        }
        let ipfsHash = await resolver.getContentHash()
        if (!ipfsHash) {
          continue
        }
        if (ipfsHash.startsWith('ipfs://')) {
          ipfsHash = ipfsHash.slice('ipfs://'.length)
        }
        tokenList = await IPFS_GATEWAY_API.fetch(ipfsHash, true)
      }

      const validate = ajv.compile(schema)
      const valid = validate(tokenList)
      if (!valid) {
        console.error(
          `validate token list from ${name}(${url}): ${validate.errors?.map(
            (error) => {
              delete error.data
              return error
            }
          )}`
        )
        continue
      }

      result.set(name, tokenList)
    }
    return result
  }
}

export const TOKENLISTS_API = new TokenListsApi()
