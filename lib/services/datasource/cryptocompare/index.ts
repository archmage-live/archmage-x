import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { fetchJsonWithCache } from '~lib/fetch'
import { QueryService } from '~lib/query'
import { useQuoteCurrency } from '~lib/quoteCurrency'
import { CacheCategory, useCache2 } from '~lib/services/cacheService'

type PriceMultiFullRawItem = {
  TYPE: string // "5"
  MARKET: string // "CCCAGG"
  FROMSYMBOL: string // "BTC"
  TOSYMBOL: string // "EVMOS"
  FLAGS: string // "2050"
  PRICE: number // 9361.98085872333
  LASTUPDATE: number // 1661336174
  LASTVOLUME: number // 0.004318
  LASTVOLUMETO: number // 40.42503334796734
  LASTTRADEID: string // "102734221154"
  VOLUMEDAY: number // 106096.31194399342
  VOLUMEDAYTO: number // 993271641.6008058
  VOLUME24HOUR: number // 257673.71562138092
  VOLUME24HOURTO: number //  2412336393.443487
  OPENDAY: number // 10209.52082829404
  HIGHDAY: number // 10586.94189136746
  LOWDAY: number // 9143.396748290736
  OPEN24HOUR: number // 10859.67020596915
  HIGH24HOUR: number // 11033.11521121887
  LOW24HOUR: number // 9139.705945908569
  LASTMARKET: string // "HuobiPro"
  VOLUMEHOUR: number // 1927.607872727863
  VOLUMEHOURTO: number // 18046228.00760265
  OPENHOUR: number // 9271.387559808612
  HIGHHOUR: number // 9394.494766771419
  LOWHOUR: number // 9206.87941362053
  TOPTIERVOLUME24HOUR: number // 257555.5666123809
  TOPTIERVOLUME24HOURTO: number // 2411230284.682751
  CHANGE24HOUR: number // -1497.6893472458214
  CHANGEPCT24HOUR: number // -13.791296778263101
  CHANGEDAY: number // -847.539969570711
  CHANGEPCTDAY: number // -8.301466678258697
  CHANGEHOUR: number // 90.5932989147168
  CHANGEPCTHOUR: number // 0.9771277312086272
  CONVERSIONTYPE: string // "divide"
  CONVERSIONSYMBOL: string // "USDT"
  SUPPLY: number // 19130543
  MKTCAP: number // 179099777382.98358
  MKTCAPPENALTY: number // 0
  CIRCULATINGSUPPLY: number // 19130543
  CIRCULATINGSUPPLYMKTCAP: number // 179099777382.98358
  TOTALVOLUME24H: number // 426890.33606419404
  TOTALVOLUME24HTO: number // 3996539155.006954
  TOTALTOPTIERVOLUME24H: number // 426235.03683019587
  TOTALTOPTIERVOLUME24HTO: number // 3990404256.1215267
  IMAGEURL: string // "/media/37746251/btc.png"
}

type PriceMultiFullDisplayItem = {
  FROMSYMBOL: string // "Ƀ"
  TOSYMBOL: string // "EVMOS"
  MARKET: string // "CryptoCompare Index"
  PRICE: string // "EVMOS 9,361.98"
  LASTUPDATE: string // "Just now"
  LASTVOLUME: string // "Ƀ 0.004318"
  LASTVOLUMETO: string // "EVMOS 40.43"
  LASTTRADEID: string // "102734221154"
  VOLUMEDAY: string // "Ƀ 106,096.3"
  VOLUMEDAYTO: string // "EVMOS 993,271,641.6"
  VOLUME24HOUR: string // "Ƀ 257,673.7"
  VOLUME24HOURTO: string // "EVMOS 2,412,336,393.4"
  OPENDAY: string // "EVMOS 10,209.5"
  HIGHDAY: string // "EVMOS 10,586.9"
  LOWDAY: string // "EVMOS 9,143.40"
  OPEN24HOUR: string // "EVMOS 10,859.7"
  HIGH24HOUR: string // "EVMOS 11,033.1"
  LOW24HOUR: string // "EVMOS 9,139.71"
  LASTMARKET: string // "HuobiPro"
  VOLUMEHOUR: string // "Ƀ 1,927.61"
  VOLUMEHOURTO: string // "EVMOS 18,046,228.0"
  OPENHOUR: string // "EVMOS 9,271.39"
  HIGHHOUR: string // "EVMOS 9,394.49"
  LOWHOUR: string // "EVMOS 9,206.88"
  TOPTIERVOLUME24HOUR: string // "Ƀ 257,555.6"
  TOPTIERVOLUME24HOURTO: string // "EVMOS 2,411,230,284.7"
  CHANGE24HOUR: string // "EVMOS -1,497.69"
  CHANGEPCT24HOUR: string // "-13.79"
  CHANGEDAY: string // "EVMOS -847.54"
  CHANGEPCTDAY: string // "-8.30"
  CHANGEHOUR: string // "EVMOS 90.59"
  CHANGEPCTHOUR: string // "0.98"
  CONVERSIONTYPE: string // "divide"
  CONVERSIONSYMBOL: string // "USDT"
  SUPPLY: string // "Ƀ 19,130,543.0"
  MKTCAP: string // "EVMOS 179.10 B"
  MKTCAPPENALTY: string // "0 %"
  CIRCULATINGSUPPLY: string // "Ƀ 19,130,543.0"
  CIRCULATINGSUPPLYMKTCAP: string // "EVMOS 179.10 B"
  TOTALVOLUME24H: string // "Ƀ 426.89 K"
  TOTALVOLUME24HTO: string // "EVMOS 4.00 B"
  TOTALTOPTIERVOLUME24H: string // "Ƀ 426.24 K"
  TOTALTOPTIERVOLUME24HTO: string // "EVMOS 3.99 B"
  IMAGEURL: string // "/media/37746251/btc.png"
}

type PriceMultiFull = {
  RAW?: PriceMultiFullRawItem
  DISPLAY?: PriceMultiFullDisplayItem
}

class CryptoCompare {
  async fetch(request: string) {
    const body = await fetchJsonWithCache(
      'https://min-api.cryptocompare.com/data' + request,
      1000 * 10 // 10s
    )
    if (body.Response === 'Error') throw new Error(body.Message)
    return body
  }

  async singlePrice(
    baseSymbol: string,
    quoteSymbol: string
  ): Promise<number | undefined> {
    const response = (await this.fetch(
      `/price?fsym=${baseSymbol}&tsyms=${quoteSymbol}`
    )) as any
    return response[quoteSymbol.toUpperCase()]
  }

  async multiPrices(
    baseSymbols: string[],
    quoteSymbol: string
  ): Promise<(number | undefined)[]> {
    const response = (await this.fetch(
      `/pricemulti?fsyms=${baseSymbols.join(',')}&tsyms=${quoteSymbol}`
    )) as any
    return baseSymbols.map(
      (symbol) => response[symbol.toUpperCase()]?.[quoteSymbol.toUpperCase()]
    )
  }

  async multiFullPrices(
    baseSymbols: string[],
    quoteSymbol: string
  ): Promise<PriceMultiFull[]> {
    type PriceMultiFullResponse = {
      RAW: Record<string, Record<string, PriceMultiFullRawItem>>
      DISPLAY: Record<string, Record<string, PriceMultiFullDisplayItem>>
    }
    const response = (await this.fetch(
      `/pricemultifull?fsyms=${baseSymbols.join(',')}&tsyms=${quoteSymbol}`
    )) as PriceMultiFullResponse
    return baseSymbols.map((symbol) => {
      return {
        RAW: response.RAW[symbol.toUpperCase()]?.[quoteSymbol.toUpperCase()],
        DISPLAY:
          response.DISPLAY[symbol.toUpperCase()]?.[quoteSymbol.toUpperCase()]
      }
    })
  }
}

export const CRYPTO_COMPARE_SERVICE = new CryptoCompare()

export function useCryptoComparePrice(currency?: string):
  | {
      imageUrl: string | undefined
      currencySymbol: string | undefined
      price: number | undefined
      displayPrice: string | undefined
      change24Hour: number | undefined
      changePercent24Hour: number | undefined
      displayChange24Hour: string | undefined
      displayChangePercent24Hour: string | undefined
    }
  | undefined {
  const { quoteCurrency, quoteCurrencySymbol } = useQuoteCurrency()

  const { data } = useQuery(
    [QueryService.CRYPTO_COMPARE, currency, quoteCurrency],
    async () =>
      currency
        ? CRYPTO_COMPARE_SERVICE.multiFullPrices([currency], quoteCurrency)
        : undefined
  )

  const result: typeof data = useCache2(
    CacheCategory.CRYPTO_COMPARE,
    currency,
    quoteCurrency,
    data
  )

  return useMemo(() => {
    if (!currency) {
      return undefined
    }

    if (!result) {
      return undefined
    }

    let imageUrl = result[0].DISPLAY?.IMAGEURL
    if (imageUrl) {
      imageUrl = 'https://www.cryptocompare.com' + imageUrl
    }

    return {
      imageUrl,
      currencySymbol: quoteCurrencySymbol,
      price: result[0].RAW?.PRICE,
      displayPrice: result[0].DISPLAY?.PRICE,
      change24Hour: result[0].RAW?.CHANGE24HOUR,
      changePercent24Hour: result[0].RAW?.CHANGEPCT24HOUR,
      displayChange24Hour: result[0].DISPLAY?.CHANGE24HOUR,
      displayChangePercent24Hour: result[0].DISPLAY?.CHANGEPCT24HOUR
    }
  }, [currency, quoteCurrencySymbol, result])
}
