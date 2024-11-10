import { createAndLogError } from '@/archmage/logger/logger'
import { isExtensionApp, isWebApp } from '@/archmage/platform'
import browser from 'webextension-polyfill'

// TODO
const EXTENSION_ID_LOCAL = ''
const EXTENSION_ID_DEV = ''
const EXTENSION_ID_BETA = ''
const EXTENSION_ID_PROD = ''

export function isTestEnv(): boolean {
  // @ts-ignore
  return !!process.env.JEST_WORKER_ID || process.env.NODE_ENV === 'test'
}

export function isDevEnv(): boolean {
  if (isWebApp) {
    return process.env.NODE_ENV === 'development'
  } else if (isExtensionApp) {
    return (
      // @ts-ignore
      globalThis.__DEV__ ||
      browser.runtime.id === EXTENSION_ID_DEV ||
      browser.runtime.id === EXTENSION_ID_LOCAL
    )
  } else {
    throw createAndLogError('isProdEnv')
  }
}

export function isBetaEnv(): boolean {
  if (isWebApp) {
    return Boolean(process.env.NEXT_PUBLIC_STAGING)
  } else if (isExtensionApp) {
    return browser.runtime.id === EXTENSION_ID_BETA
  } else {
    throw createAndLogError('isBetaEnv')
  }
}

export function isProdEnv(): boolean {
  if (isWebApp) {
    return process.env.NODE_ENV === 'production' && !isBetaEnv()
  } else if (isExtensionApp) {
    return browser.runtime.id === EXTENSION_ID_PROD
  } else {
    throw createAndLogError('isProdEnv')
  }
}

export function getEnvName(): 'production' | 'staging' | 'development' {
  if (isBetaEnv()) {
    return 'staging'
  }
  if (isProdEnv()) {
    return 'production'
  }
  return 'development'
}
