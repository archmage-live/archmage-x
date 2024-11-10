import { assert } from '~archmage/errors'
import { HDNodeWallet, KeystoreAccount, Wordlist } from 'ethers'

import { getWordlist, mnemonicFromKeystore } from './mnemonic'

export { HDNodeWallet }

export const HardenedBit = 0x80000000

export function hdNodeFromPhrase(
  phrase: string,
  path: string = 'm',
  wordlist?: string | Wordlist
): HDNodeWallet {
  // If a locale name was passed in, find the associated wordlist.
  wordlist = getWordlist(wordlist)

  return HDNodeWallet.fromPhrase(phrase, '', path, wordlist)
}

export function hdNodeFromKeystore(account: KeystoreAccount): HDNodeWallet {
  const mnemonic = mnemonicFromKeystore(account)
  const node = HDNodeWallet.fromMnemonic(
    mnemonic,
    account.mnemonic!.path || 'm'
  )
  assert(
    node.address === account.address && node.privateKey === account.privateKey,
    'KeystoreAccount invalid'
  )
  return node
}
