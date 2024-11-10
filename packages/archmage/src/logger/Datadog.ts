import { PlatformSplitStubError } from '@/archmage/errors'
import { LogLevel, LoggerErrorContext } from '@/archmage/logger/types'

export function setupDatadog(): void {
  throw new PlatformSplitStubError('setupDatadog')
}

export function logToDatadog(
  _message: string,
  _options: {
    level: LogLevel
    args: unknown[]
    fileName: string
    functionName: string
  }
): void {
  throw new PlatformSplitStubError('logToDatadog')
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
  throw new PlatformSplitStubError('logWarningToDatadog')
}

export function logErrorToDatadog(_error: Error, _context?: LoggerErrorContext): void {
  throw new PlatformSplitStubError('logErrorToDatadog')
}

export function attachUnhandledRejectionHandler(): void {
  throw new PlatformSplitStubError('attachUnhandledRejectionHandler')
}
