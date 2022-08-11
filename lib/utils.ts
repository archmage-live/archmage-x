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

// shorten the checksummed version of the input address to have 0x + 4 characters at start and end
export function shortenAddress(address?: string, chars = 4): string {
  if (!address) {
    return ''
  }
  return `${address.substring(0, chars + 2)}...${address.substring(
    address.length - chars
  )}`
}
