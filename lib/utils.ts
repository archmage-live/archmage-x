import { ethers } from 'ethers'

export function isMnemonic(mnemonic: string): boolean {
  try {
    const _ = ethers.utils.HDNode.fromMnemonic(mnemonic)
    return true
  } catch {
    return false
  }
}

export function isPrivateKey(privateKey: string): boolean {
  try {
    const _ = new ethers.Wallet(privateKey)
    return true
  } catch {
    return false
  }
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
    return ''
  }

  const { leadingChars = 2, prefixChars = 3, suffixChars = 4 } = opts || {}

  return `${address.substring(
    0,
    (typeof leadingChars === 'number' ? leadingChars : leadingChars.length) +
      prefixChars
  )}...${address.substring(address.length - suffixChars)}`
}
