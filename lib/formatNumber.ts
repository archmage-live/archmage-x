import { Decimal } from 'decimal.js'

import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '~constants/locales'

interface FormatLocaleNumberArgs {
  number?: number | string | Decimal | null
  locale?: string
  options?: Intl.NumberFormatOptions
  sigFigs?: number
  fixedDecimals?: number
  placeholder?: string
}

export function formatNumberWithOptions({
  number,
  locale,
  options = {},
  sigFigs,
  fixedDecimals,
  placeholder
}: FormatLocaleNumberArgs): string {
  let localeArg: string | string[]
  if (!locale || (locale && !SUPPORTED_LOCALES.includes(locale))) {
    localeArg = DEFAULT_LOCALE
  } else {
    localeArg = [locale, DEFAULT_LOCALE]
  }
  options.minimumFractionDigits = options.minimumFractionDigits || fixedDecimals
  options.maximumFractionDigits = options.maximumFractionDigits || fixedDecimals

  // Fixed decimals should override significant figures.
  options.maximumSignificantDigits =
    options.maximumSignificantDigits || fixedDecimals ? undefined : sigFigs

  let num: number
  if (number === undefined || number === null) {
    num = 0
  } else if (typeof number === 'string') {
    num = Number(number)
  } else if (number instanceof Decimal) {
    num = number.toNumber()
  } else {
    num = number
  }

  num = fixedDecimals ? parseFloat(num.toFixed(fixedDecimals)) : num

  const numStr = Intl.NumberFormat(localeArg, options).format(num)

  if (placeholder && (number === undefined || number === null)) {
    return numStr.replace(/\d+(?:\.\d+)?|\.\d+/, placeholder)
  } else {
    return numStr
  }
}

export function formatNumberStandard(
  number?: number | string | Decimal | null,
  maximumFractionDigits = 2,
  placeholder?: string
): string {
  return formatNumberWithOptions({
    number,
    options: {
      maximumFractionDigits
    },
    placeholder
  })
}

export function formatNumberCompact(
  number?: number | string | Decimal | null,
  maximumFractionDigits = 2,
  placeholder?: string
): string {
  return formatNumberWithOptions({
    number,
    options: {
      notation: 'compact',
      compactDisplay: 'short',
      // minimumSignificantDigits: 1,
      // maximumSignificantDigits: 3,
      maximumFractionDigits
    },
    placeholder
  })
}

export function formatNumber(
  number?: number | string | Decimal | null,
  negScale?: number,
  maximumFractionDigits = 4,
  maximumIntegerDigits = 7,
  placeholder = '--'
): string {
  if (number !== undefined && number !== null && negScale !== undefined) {
    number = new Decimal(number).div(new Decimal(10).pow(negScale)).toNumber()
  }
  const numStr = formatNumberStandard(
    number,
    maximumFractionDigits,
    placeholder
  )
  if (numStr.length <= maximumIntegerDigits + maximumFractionDigits) {
    return numStr
  }
  return formatNumberCompact(number, maximumFractionDigits, placeholder)
}
