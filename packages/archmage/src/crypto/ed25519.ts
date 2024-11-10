import { KeystoreAccount, Mnemonic, Wordlist, getBytes } from 'ethers'
import { HARDENED_OFFSET, HDKey } from 'micro-key-producer/slip10.js'

import { getWordlist, mnemonicFromKeystore } from './mnemonic'

export { HDKey, HARDENED_OFFSET }

export function hdKeyFromPhrase(
  phrase: string,
  password?: string,
  wordlist?: string | Wordlist
): HDKey {
  // If a locale name was passed in, find the associated wordlist.
  wordlist = getWordlist(wordlist)

  const mnemonic = Mnemonic.fromPhrase(phrase, password, wordlist)
  return HDKey.fromMasterSeed(getBytes(mnemonic.computeSeed()))
}

export function hdKeyFromKeystore(account: KeystoreAccount) {
  const mnemonic = mnemonicFromKeystore(account)
  const key = HDKey.fromMasterSeed(getBytes(mnemonic.computeSeed()))
  return key.derive(account.mnemonic!.path || 'm')
}
