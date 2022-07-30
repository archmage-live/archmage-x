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
