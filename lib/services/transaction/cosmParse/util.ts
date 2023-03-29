import { Coin } from '~lib/network/cosm/coin'
import { Dec } from '~lib/network/cosm/number'
import { TokenInfo } from '~lib/services/datasource/cosmostation'

export function extractEventAttributes(
  events: {
    type: string
    attributes: { key: string; value: string }[]
  }[],
  type: string
): Map<string, string> | undefined {
  const event = events.find((event) => event.type === type)
  if (!event) {
    return
  }
  const result = new Map<string, string>()
  event.attributes.forEach((attr) => {
    result.set(attr.key, attr.value)
  })
  return result
}

export function formatCosmCoin(
  coin: string | Coin | undefined,
  tokenInfos?: Map<string, TokenInfo>
) {
  if (!coin) {
    return ''
  }
  const c = coin instanceof Coin ? coin : Coin.fromString(coin)
  const info = tokenInfos?.get(c.denom)
  if (info) {
    return `${new Dec(c.amount)
      .divPow(info.decimals)
      .toDecimalPlaces(info.decimals)
      .toString()} ${info.symbol}`
  } else {
    return c.toString()
  }
}
