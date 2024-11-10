import dayjs from 'dayjs'

export const SECONDS_IN_MINUTE = 60
export const MINUTES_IN_HOUR = 60
export const HOURS_IN_DAY = 24

export const ONE_SECOND_MS = 1000
export const ONE_MINUTE_MS = SECONDS_IN_MINUTE * ONE_SECOND_MS
export const ONE_HOUR_MS = MINUTES_IN_HOUR * ONE_MINUTE_MS
export const ONE_DAY_MS = HOURS_IN_DAY * ONE_HOUR_MS
export const MAX_REACT_QUERY_CACHE_TIME_MS = ONE_DAY_MS * 24

// Polling interval (in milliseconds) for data fetching
export enum PollingInterval {
  Slow = 5 * ONE_MINUTE_MS,
  Normal = ONE_MINUTE_MS,
  KindaFast = 30 * ONE_SECOND_MS,
  Fast = 15 * ONE_SECOND_MS, // slightly higher than block times for mainnet
  LightningMcQueen = 6 * ONE_SECOND_MS // slightly higher than block times for polygon
}

export function isStale(lastUpdated: number | null, staleTime: number): boolean {
  return !lastUpdated || Date.now() - lastUpdated > staleTime
}

export function currentTimeInSeconds(): number {
  return dayjs().unix() // in seconds
}

export function inXMinutesUnix(x: number): number {
  return dayjs().add(x, 'minute').unix()
}
