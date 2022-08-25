import { useAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

export const SUPPORTED_QUOTE_CURRENCIES = [
  'BTC',
  'ETH',
  'USD',
  'EUR',
  'JPY',
  'CNY',
  'HKD',
  'SGD',
  'KRW',
  'RUB'
]

export type SupportedQuoteCurrency = typeof SUPPORTED_QUOTE_CURRENCIES[number]

export const DEFAULT_QUOTE_CURRENCY = 'USD'

export const QUOTE_CURRENCY_LABEL: Record<SupportedQuoteCurrency, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ether',
  USD: 'US Dollar',
  EUR: 'Euro',
  JPY: 'Japanese Yen',
  CNY: 'Chinese Yuan',
  HKD: 'Hong Kong Dollar',
  SGD: 'Singapore Dollar',
  KRW: 'South Korean Won',
  RUB: 'Russian Ruble'
}

export const QUOTE_CURRENCY_SYMBOL: Record<SupportedQuoteCurrency, string> = {
  BTC: 'Ƀ',
  ETH: 'Ξ',
  USD: '$',
  EUR: '€',
  JPY: 'JPY ¥',
  CNY: '¥',
  HKD: 'HKD',
  SGD: 'SGD',
  KRW: '₩',
  RUB: '₽'
}

const quoteCurrencyKey = 'quoteCurrency'
const quoteCurrencyAtom = atomWithStorage<SupportedQuoteCurrency>(
  quoteCurrencyKey,
  DEFAULT_QUOTE_CURRENCY
)

export function useQuoteCurrency() {
  const [quoteCurrency, setQuoteCurrency] = useAtom(quoteCurrencyAtom)
  return {
    quoteCurrency,
    quoteCurrencySymbol: QUOTE_CURRENCY_SYMBOL[quoteCurrency],
    setQuoteCurrency
  }
}
