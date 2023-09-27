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

  const {
    leadingChars: _leadingChars = 2,
    prefixChars = 3,
    suffixChars = 4
  } = opts || {}

  const leadingChars =
    typeof _leadingChars === 'number' ? _leadingChars : _leadingChars.length

  if (str.length <= leadingChars + prefixChars + suffixChars) {
    return str
  }

  return `${str.substring(0, leadingChars + prefixChars)}...${str.substring(
    str.length - suffixChars
  )}`
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

  if (Array.isArray(object)) {
    return object.map(stringifyBigNumberish) as any
  }

  const result: any = {}
  for (const key in object) {
    const value = object[key]
    if (value !== undefined) {
      if (typeof value === 'bigint') {
        // serialize bigint to string
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
