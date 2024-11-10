import { getLocales } from 'expo-localization'

import { logger } from '@/archmage/logger/logger'

import { DEFAULT_LANGUAGE_CODE, DEFAULT_LANGUAGE_TAG, DeviceLocale } from './constants'

export function getDeviceLocales(): DeviceLocale[] {
  try {
    return getLocales().map(({ languageCode, languageTag }) => {
      return { languageCode, languageTag }
    })
  } catch (e) {
    const isKnownError = e instanceof Error && e.message.includes('Unsupported ISO 3166 country')
    if (!isKnownError) {
      logger.error(e, {
        level: 'warning',
        tags: { file: 'locales.ts', function: 'getDeviceLocales' }
      })
    }
  }
  return [
    {
      languageCode: DEFAULT_LANGUAGE_CODE,
      languageTag: DEFAULT_LANGUAGE_TAG
    }
  ]
}
