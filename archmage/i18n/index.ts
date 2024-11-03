import i18n from 'i18next'

// note: not using isWebApp here for tree shaking
if (!process.env.NEXT_PUBLIC_IS_ARCHMAGE_WEB) {
  require('./i18n-setup')
}

export { t } from 'i18next'
export { Plural } from './Plural'
export { Trans } from './Trans'
export { changeLanguage } from './changeLanguage'
export { useTranslation } from './useTranslation'

export default i18n
