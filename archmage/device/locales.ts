import browser from 'webextension-polyfill'

import { logger } from '@/archmage/logger/logger'

import { DEFAULT_LANGUAGE_CODE, DEFAULT_LANGUAGE_TAG, DeviceLocale } from './constants'

export function getDeviceLocales(): DeviceLocale[] {
  try {
    const language = browser.i18n.getUILanguage()
    return [{ languageCode: language, languageTag: language }]
  } catch (e) {
    logger.error(e, {
      level: 'warning',
      tags: { file: 'locales.ts', function: 'getDeviceLocales' }
    })
  }
  return [
    {
      languageCode: DEFAULT_LANGUAGE_CODE,
      languageTag: DEFAULT_LANGUAGE_TAG
    }
  ]
}
