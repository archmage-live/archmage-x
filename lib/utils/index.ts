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
