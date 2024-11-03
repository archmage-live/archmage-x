import { logErrorToDatadog, logToDatadog, logWarningToDatadog } from '@/archmage/logger/Datadog'
import { Sentry } from '@/archmage/logger/Sentry'
import { LogLevel, LoggerErrorContext } from '@/archmage/logger/types'
import { addErrorExtras } from '@/archmage/logger/util'
import { isMobileApp, isWeb, isWebApp } from '@/archmage/platform'

const SENTRY_CHAR_LIMIT = 8192

/**
 * Logs a message to console. Additionally, sends log to Sentry and Datadog if using 'error', 'warn', or 'info'.
 * Use `logger.debug` for development only logs.
 *
 * ex. `logger.warn('myFile', 'myFunc', 'Some warning', myArray)`
 *
 * @param fileName Name of file where logging from
 * @param functionName Name of function where logging from
 * @param message Message to log
 * @param args Additional values to log
 */
export const logger = {
  debug: (fileName: string, functionName: string, message: string, ...args: unknown[]): void =>
    logMessage('debug', fileName, functionName, message, ...args),
  info: (fileName: string, functionName: string, message: string, ...args: unknown[]): void =>
    logMessage('info', fileName, functionName, message, ...args),
  warn: (fileName: string, functionName: string, message: string, ...args: unknown[]): void =>
    logMessage('warn', fileName, functionName, message, ...args),
  error: (error: unknown, captureContext: LoggerErrorContext): void =>
    logException(error, captureContext)
}

function logMessage(
  level: LogLevel,
  fileName: string,
  functionName: string,
  message: string,
  ...args: unknown[] // arbitrary extra data - ideally formatted as key value pairs
): void {
  // Log to console directly for dev builds or interface for debugging
  if (__DEV__ || isWebApp) {
    // eslint-disable-next-line no-console
    console[level](...formatMessage(level, fileName, functionName, message), ...args)
  }

  // Skip sentry logs for dev builds
  if (__DEV__) {
    return
  }

  if (level === 'warn') {
    Sentry.captureMessage('warning', `${fileName}#${functionName}`, message, ...args)
    if (isMobileApp) {
      logWarningToDatadog(message, {
        level,
        args,
        functionName,
        fileName
      })
    }
  } else if (level === 'info') {
    Sentry.captureMessage('info', `${fileName}#${functionName}`, message, ...args)
    if (isMobileApp) {
      logToDatadog(message, {
        level,
        args,
        functionName,
        fileName
      })
    }
  }

  if (isWebApp) {
    logToDatadog(message, {
      level,
      args,
      functionName,
      fileName
    })
  }
}

function logException(error: unknown, captureContext: LoggerErrorContext): void {
  const updatedContext = addErrorExtras(error, captureContext)

  // Log to console directly for dev builds or interface for debugging
  if (__DEV__ || isWebApp) {
    // eslint-disable-next-line no-console
    console.error(error)
  }

  // Skip sentry logs for dev builds
  if (__DEV__) {
    return
  }

  // Limit character length for string tags to the max Sentry allows
  for (const contextProp of Object.keys(updatedContext.tags)) {
    const prop = contextProp as 'file' | 'function'
    const contextValue = updatedContext.tags[prop]
    if (typeof contextValue === 'string') {
      updatedContext.tags[prop] = contextValue.slice(0, SENTRY_CHAR_LIMIT)
    }
  }

  Sentry.captureException(error, updatedContext)
  if (isWebApp || isMobileApp) {
    logErrorToDatadog(error instanceof Error ? error : new Error(`${error}`), updatedContext)
  }
}

function pad(n: number, amount: number = 2): string {
  return n.toString().padStart(amount, '0')
}

function formatMessage(
  level: LogLevel,
  fileName: string,
  functionName: string,
  message: string
): (string | Record<string, unknown>)[] {
  const t = new Date()
  const timeString = `${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}.${pad(t.getMilliseconds(), 3)}`
  if (isWeb) {
    // Simpler printing for web logging
    return [
      level.toUpperCase(),
      {
        context: {
          time: timeString,
          fileName,
          functionName
        }
      },
      message

    ]
  } else {
    // Specific printing style for mobile logging
    return [`${timeString}::${fileName}#${functionName}`, message]
  }
}

export function createAndLogError(funcName: string): Error {
  const e = new Error('Unsupported app environment that failed all checks')
  logger.error(e, {
    tags: {
      file: '@/archmage/environment/index.ts',
      function: funcName
    }
  })
  return e
}
