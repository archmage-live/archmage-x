import { useAtom } from 'jotai/index'
import { useCallback } from 'react'

import { FiatCurrencyComponents, getFiatCurrencyComponents } from '@/archmage/format/localeBased'
import i18n from '@/archmage/i18n'
import { useLocalizedFormatter } from '@/archmage/language/formatter'
import { useCurrentLocale } from '@/archmage/language/hooks'
import { atomWithLocalStore, storeKey } from '@/archmage/store'

import { FiatCurrency } from './constants'
import { useFiatConverter } from './conversion'

/**
 * Helper function for getting the ISO currency code from our internal enum
 * @param currency target currency
 * @returns ISO currency code
 */
// ISO currency code is only in English and cannot be translated
export function getFiatCurrencyCode(currency: FiatCurrency): string {
  return currency.toString()
}

/**
 * Hook to get the currency symbol based on the fiat currency in the current
 * language/locale, which is why it's a hook
 * @param currency target currency
 * @returns currency symbol
 */
export function useFiatCurrencyComponents(
  currency: FiatCurrency
): FiatCurrencyComponents | undefined {
  const locale = useCurrentLocale()
  const currencyCode = getFiatCurrencyCode(currency)

  return locale && getFiatCurrencyComponents(locale, currencyCode)
}

/**
 * Helper used to get the fiat currency name in the current app language
 * @param currency target currency
 * @returns currency name
 */
export function getFiatCurrencyName(currency: FiatCurrency): { name: string; shortName: string } {
  const t = i18n.t
  const currencyToCurrencyName: Record<FiatCurrency, string> = {
    [FiatCurrency.AustrialianDollor]: t('currency.aud'),
    [FiatCurrency.BrazilianReal]: t('currency.brl'),
    [FiatCurrency.CanadianDollar]: t('currency.cad'),
    [FiatCurrency.ChineseYuan]: t('currency.cny'),
    [FiatCurrency.Euro]: t('currency.eur'),
    [FiatCurrency.BritishPound]: t('currency.gbp'),
    [FiatCurrency.HongKongDollar]: t('currency.hkd'),
    [FiatCurrency.IndonesianRupiah]: t('currency.idr'),
    [FiatCurrency.IndianRupee]: t('currency.inr'),
    [FiatCurrency.JapaneseYen]: t('currency.jpy'),
    [FiatCurrency.SouthKoreanWon]: t('currency.krw'),
    [FiatCurrency.NigerianNaira]: t('currency.ngn'),
    [FiatCurrency.PakistaniRupee]: t('currency.pkr'),
    [FiatCurrency.RussianRuble]: t('currency.rub'),
    [FiatCurrency.SingaporeDollar]: t('currency.sgd'),
    [FiatCurrency.ThaiBaht]: t('currency.thb'),
    [FiatCurrency.TurkishLira]: t('currency.try'),
    [FiatCurrency.UkrainianHryvnia]: t('currency.uah'),
    [FiatCurrency.UnitedStatesDollar]: t('currency.usd'),
    [FiatCurrency.VietnameseDong]: t('currency.vnd')
  }
  const currencyToGlobalSymbol: Record<FiatCurrency, string> = {
    [FiatCurrency.AustrialianDollor]: '$',
    [FiatCurrency.BrazilianReal]: 'R$',
    [FiatCurrency.CanadianDollar]: '$',
    [FiatCurrency.ChineseYuan]: '¥',
    [FiatCurrency.Euro]: '€',
    [FiatCurrency.BritishPound]: '£',
    [FiatCurrency.HongKongDollar]: '$',
    [FiatCurrency.IndonesianRupiah]: 'Rp',
    [FiatCurrency.IndianRupee]: '₹',
    [FiatCurrency.JapaneseYen]: '¥',
    [FiatCurrency.SouthKoreanWon]: '₩',
    [FiatCurrency.NigerianNaira]: '₦',
    [FiatCurrency.PakistaniRupee]: 'Rs',
    [FiatCurrency.RussianRuble]: '₽',
    [FiatCurrency.SingaporeDollar]: '$',
    [FiatCurrency.ThaiBaht]: '฿',
    [FiatCurrency.TurkishLira]: '₺',
    [FiatCurrency.UkrainianHryvnia]: '₴',
    [FiatCurrency.UnitedStatesDollar]: '$',
    [FiatCurrency.VietnameseDong]: '₫'
  }

  const code = getFiatCurrencyCode(currency)
  const symbol = currencyToGlobalSymbol[currency]
  return { name: currencyToCurrencyName[currency], shortName: `${code} (${symbol})` }
}

export type FiatCurrencyInfo = {
  name: string
  shortName: string
  code: string
} & FiatCurrencyComponents

/**
 * Hook used to get fiat currency info (name, code, symbol, etc.) in the current app language
 * @param currency target currency
 * @returns all relevant currency info
 */
export function useFiatCurrencyInfo(currency: FiatCurrency): FiatCurrencyInfo | undefined {
  const components = useFiatCurrencyComponents(currency)
  const { name, shortName } = getFiatCurrencyName(currency)
  const code = getFiatCurrencyCode(currency)

  return (
    components && {
      ...components,
      name,
      shortName,
      code
    }
  )
}

const CURRENT_CURRENCY_KEY = storeKey('currentCurrency')
const currentCurrencyAtom = atomWithLocalStore(
  CURRENT_CURRENCY_KEY,
  FiatCurrency.UnitedStatesDollar
)

/**
 * Hook used to return the current selected fiat currency in the app
 * @returns currently selected fiat currency
 */
export function useCurrentFiatCurrency() {
  return useAtom(currentCurrencyAtom)
}

/**
 * Hook used to return all relevant currency info (name, code, symbol, etc.)
 * for the currently selected fiat currency in the app
 * @returns all relevant info for the currently selected fiat currency
 */
export function useCurrentFiatCurrencyInfo(): FiatCurrencyInfo | undefined {
  const [currency] = useCurrentFiatCurrency()

  const info = useFiatCurrencyInfo(currency || FiatCurrency.UnitedStatesDollar)

  return currency && info
}

/**
 * Hook to convert local fiat currency amount to USD amount
 * @returns USD amount
 */
export const useLocalFiatToUSDConverter = (): ((fiatAmount: number) => number | undefined) => {
  const { formatNumberOrString } = useLocalizedFormatter()
  const { convertFiatAmount } = useFiatConverter(formatNumberOrString)
  return useCallback(
    (fiatAmount: number): number | undefined => {
      const { amount: USDInLocalCurrency } = convertFiatAmount(1)
      return USDInLocalCurrency ? fiatAmount / USDInLocalCurrency : undefined
    },
    [convertFiatAmount]
  )
}
