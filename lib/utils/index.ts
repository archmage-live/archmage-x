import { BigNumberish } from '@alchemy/aa-core/src/types'

export function stall(duration: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, duration)
  })
}

// shorten the input string
export function shortenString(
  str?: string,
  opts?: {
    leadingChars?: number | string
    prefixChars?: number
    suffixChars?: number
  }
): string {
  if (!str) {
    return 'Not Available'
  }

  const { leadingChars = 2, prefixChars = 3, suffixChars = 4 } = opts || {}

  return `${str.substring(
    0,
    (typeof leadingChars === 'number' ? leadingChars : leadingChars.length) +
      prefixChars
  )}...${str.substring(str.length - suffixChars)}`
}

export function shallowClean<T>(object: T): T {
  if (!object) {
    return object
  }

  const result: any = {}
  for (const key in object) {
    const value = object[key]
    if (value !== undefined) {
      result[key] = value
    }
  }
  return result
}

export function stringifyBigNumberish<T>(object: T): T {
  if (!object || typeof object !== 'object') {
    return object
  }

  const result: any = {}
  for (const key in object) {
    const value = object[key]
    if (value !== undefined) {
      if (typeof value === 'number' || typeof value === 'bigint') {
        // serialize number/bigint to string
        result[key] = value.toString()
      } else if (Array.isArray(value)) {
        result[key] = value.map(stringifyBigNumberish)
      } else if (typeof value === 'object') {
        result[key] = stringifyBigNumberish(value)
      } else {
        result[key] = value
      }
    }
  }

  return result
}
