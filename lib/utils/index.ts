import { ethers } from 'ethers'

export function stall(duration: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, duration)
  })
}

// shorten the checksummed version of the input address
export function shortenAddress(
  address?: string,
  opts?: {
    leadingChars?: number | string
    prefixChars?: number
    suffixChars?: number
  }
): string {
  if (!address) {
    return 'Not Available'
  }

  const { leadingChars = 2, prefixChars = 3, suffixChars = 4 } = opts || {}

  return `${address.substring(
    0,
    (typeof leadingChars === 'number' ? leadingChars : leadingChars.length) +
      prefixChars
  )}...${address.substring(address.length - suffixChars)}`
}
