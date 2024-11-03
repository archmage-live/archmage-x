import { KeystoreAccount, Mnemonic, Wordlist, wordlists } from 'ethers'

import { assert } from '~archmage/errors'

export function mnemonicFromKeystore(account: KeystoreAccount): Mnemonic {
  const m = account.mnemonic
  assert(m, 'KeystoreAccount missing mnemonic')
  return Mnemonic.fromEntropy(m.entropy, null, getWordlist(m.locale))
}

export function getWordlist(wordlist?: string | Wordlist): Wordlist {
  if (!wordlist) {
    return wordlists['en']
  }

  if (typeof wordlist === 'string') {
    const words = wordlists[wordlist]
    if (words == null) {
      throw new Error(`unknown locale: ${wordlist}`)
    }
    return words
  }

  return wordlist
}
