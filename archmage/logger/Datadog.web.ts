import { datadogLogs } from '@datadog/browser-logs'
import { v4 as uuidv4 } from 'uuid'

import { getEnvName, isTestEnv } from '@/archmage/environment'
import { NotImplementedError } from '@/archmage/errors'
import { LogLevel, LoggerErrorContext } from '@/archmage/logger/types'

// setup user information
const USER_ID_KEY = 'datadog-user-id'

export function setupDatadog(): void {
  if (isTestEnv()) {
    return
  }
  if (!process.env.NEXT_PUBLIC_DATADOG_CLIENT_TOKEN) {
    // eslint-disable-next-line no-console
    console.error(`No datadog client token, disabling`)
    return
  }

  datadogLogs.init({
    clientToken: process.env.NEXT_PUBLIC_DATADOG_CLIENT_TOKEN,
    site: 'datadoghq.com',
    forwardErrorsToLogs: true
  })

  let userId = localStorage.getItem(USER_ID_KEY)
  if (!userId) {
    localStorage.setItem(USER_ID_KEY, (userId = uuidv4()))
  }
  datadogLogs.setUser({
    id: userId
  })

  datadogLogs.setUserProperty('env', getEnvName())
  datadogLogs.setUserProperty('version', process.env.NEXT_PUBLIC_GIT_COMMIT_HASH)
}

export function logToDatadog(
  message: string,
  {
    level,
    ...options
  }: {
    level: LogLevel
    args: unknown[]
    fileName: string
    functionName: string
  }
): void {
  if (isTestEnv()) {
    return
  }
  datadogLogs.logger[level](message, options)
}

export function logWarningToDatadog(
  _message: string,
  _options: {
    level: LogLevel
    args: unknown[]
    fileName: string
    functionName: string
  }
): void {
  throw new NotImplementedError('logWarningToDatadog')
}

export function logErrorToDatadog(error: Error, context?: LoggerErrorContext): void {
  if (isTestEnv()) {
    return
  }
  if (error instanceof Error) {
    datadogLogs.logger.error(error.message, {
      error: {
        kind: error.name,
        stack: error.stack
      },
      ...context
    })
  } else {
    datadogLogs.logger.error(error, {
      error: {
        stack: new Error().stack
      },
      ...context
    })
  }
}

export function attachUnhandledRejectionHandler(): void {
  throw new NotImplementedError('attachUnhandledRejectionHandler')
}
