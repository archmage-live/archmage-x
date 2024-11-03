import { Extras } from '@sentry/types'

import { LoggerErrorContext } from '@/archmage/logger/types'

interface RNError {
  nativeStackAndroid?: unknown
  userInfo?: unknown
}

// Adds extra fields from errors provided by React Native
export function addErrorExtras(
  error: unknown,
  captureContext: LoggerErrorContext
): LoggerErrorContext {
  if (error instanceof Error) {
    const extras: Extras = {}
    const { nativeStackAndroid, userInfo } = error as RNError

    if (Array.isArray(nativeStackAndroid) && nativeStackAndroid.length > 0) {
      extras.nativeStackAndroid = nativeStackAndroid
    }

    if (userInfo) {
      extras.userInfo = userInfo
    }

    return { ...captureContext, extra: { ...captureContext.extra, ...extras } }
  }
  return captureContext
}
