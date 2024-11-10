import { I18nManager } from 'react-native'
import RNRestart from 'react-native-restart'
import { useAsync } from 'react-use'

import { getDeviceLocales } from '@/archmage/device/locales'
import i18n from '@/archmage/i18n'
import { logger } from '@/archmage/logger/logger'
import { isMobileApp } from '@/archmage/platform'

import {
  Language,
  Locale,
  SUPPORTED_LANGUAGES,
  mapDeviceLanguageToLanguage,
  mapLocaleToLanguage
} from './constants'
import { getLocale, useCurrentLanguage } from './hooks'

export function useSyncWithDeviceLanguage(preferredLanguage?: Language) {
  const [currentLanguage, setCurrentLanguage] = useCurrentLanguage()

  useAsync(async () => {
    const languageToSet = !preferredLanguage ? getDeviceLanguage() : preferredLanguage
    const localeToSet = getLocale(languageToSet)

    if (currentLanguage === languageToSet && localeToSet === i18n.language) {
      return
    }

    await setCurrentLanguage(languageToSet)

    try {
      await i18n.changeLanguage(localeToSet)
    } catch {
      logger.warn(
        'useSyncWithDeviceLanguage.ts',
        'useSyncWithDeviceLanguage',
        'Sync of language setting state and i18n instance failed'
      )
    }

    if (isMobileApp) {
      restartAppIfRTL(localeToSet)
    }
  }, [preferredLanguage, currentLanguage])
}

function getDeviceLanguage(): Language {
  // Gets the user device locales in order of their preference
  const deviceLocales = getDeviceLocales()

  for (const locale of deviceLocales) {
    // Normalizes language tags like 'zh-Hans-ch' to 'zh-Hans' that could happen on Android
    const normalizedLanguageTag = locale.languageTag.split('-').slice(0, 2).join('-') as Locale
    const mappedLanguageFromTag = Object.values(Locale).includes(normalizedLanguageTag)
      ? mapLocaleToLanguage[normalizedLanguageTag]
      : mapDeviceLanguageToLanguage[normalizedLanguageTag]
    const mappedLanguageFromCode = locale.languageCode as Maybe<Language>
    // Prefer languageTag as it's more specific, falls back to languageCode
    const mappedLanguage = mappedLanguageFromTag || mappedLanguageFromCode

    if (mappedLanguage && SUPPORTED_LANGUAGES.includes(mappedLanguage)) {
      return mappedLanguage
    }
  }

  // Default to English if no supported language is found
  return Language.English
}

function restartAppIfRTL(currentLocale: Locale) {
  const isRtl = i18n.dir(currentLocale) === 'rtl'
  if (isRtl !== I18nManager.isRTL) {
    logger.debug(
      'useSyncWithDeviceLanguage.ts',
      'restartAppIfRTL',
      `Changing RTL to ${isRtl} for locale ${currentLocale}`
    )
    I18nManager.allowRTL(isRtl)
    I18nManager.forceRTL(isRtl)

    // Need to restart to apply RTL changes
    // RNRestart requires timeout to work properly with reanimated
    setTimeout(() => {
      RNRestart.restart()
    }, 1000)
  }
}
