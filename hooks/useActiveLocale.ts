import { useAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { useEffect, useState } from 'react'
import browser from 'webextension-polyfill'

import type { SupportedLocale } from '~constants/locales'
import {
  DEFAULT_LOCALE,
  LOCALE_CODE,
  SUPPORTED_LOCALES
} from '~constants/locales'

/**
 * Given a locale string, return the best match for corresponding SupportedLocale
 * @param maybeSupportedLocale the fuzzy locale identifier
 */
function parseLocale(
  maybeSupportedLocale: unknown
): SupportedLocale | undefined {
  if (typeof maybeSupportedLocale !== 'string') return undefined
  const lowerMaybeSupportedLocale = maybeSupportedLocale.toLowerCase()
  return SUPPORTED_LOCALES.find(
    (locale) =>
      locale.toLowerCase() === lowerMaybeSupportedLocale ||
      locale.split('-')[0] === lowerMaybeSupportedLocale
  )
}

async function browserLocale(): Promise<SupportedLocale> {
  let acceptLocaleCodes: string[] = []
  try {
    acceptLocaleCodes = await browser.i18n.getAcceptLanguages()
  } catch (e) {
    // Brave currently throws when calling getAcceptLanguages.
  }
  for (const code of acceptLocaleCodes) {
    if (SUPPORTED_LOCALES.indexOf(code) >= 0) {
      return code
    }
    return LOCALE_CODE[code.toLowerCase().replace('_', '-').split('-')[0]]
  }
  return DEFAULT_LOCALE
}

function useBrowserLocale(): SupportedLocale | undefined {
  const [locale, setLocale] = useState<SupportedLocale | undefined>()
  useEffect(() => {
    browserLocale().then(setLocale)
  }, [])
  return locale
}

const userLocaleKey = 'userLocale'
const userLocaleAtom = atomWithStorage<SupportedLocale | null>(
  userLocaleKey,
  null
)

export function useUserLocale() {
  const [userLocale, setUserLocale] = useAtom(userLocaleAtom)
  return {
    userLocale,
    setUserLocale
  }
}

function userLocale(): SupportedLocale | undefined {
  const userLocaleStr = localStorage.getItem(userLocaleKey)
  if (!userLocaleStr) {
    return
  }
  let userLocale
  try {
    userLocale = JSON.parse(userLocaleStr)
  } catch {}
  return parseLocale(userLocale)
}

export function useActiveLocale(): SupportedLocale | undefined {
  const { userLocale } = useUserLocale()
  const browserLocale = useBrowserLocale()
  return userLocale ?? browserLocale
}
