import assert from 'assert'
import { ethers } from 'ethers'

import { keystore } from '~lib/keystore'
import type { WalletOpts } from '~lib/wallet'
import { WalletType } from '~lib/wallet'

export class EvmWallet {
  wallet!: ethers.utils.HDNode | ethers.Wallet

  static async from({ id, type, path }: WalletOpts): Promise<EvmWallet> {
    const ks = await keystore.get(id)
    assert(ks)
    const mnemonic = ks.mnemonic

    let wallet
    if (type === WalletType.HD) {
      assert(!path && mnemonic)
      wallet = ethers.utils.HDNode.fromMnemonic(mnemonic.phrase)
    } else if (type === WalletType.MNEMONIC_PRIVATE_KEY) {
      assert(mnemonic)
      wallet = ethers.Wallet.fromMnemonic(mnemonic.phrase, path)
    } else {
      assert(!path)
      wallet = new ethers.Wallet(ks.privateKey)
    }

    return {
      wallet
    } as EvmWallet
  }

  derive(prefixPath: string, index: number): EvmWallet {
    assert(this.wallet instanceof ethers.utils.HDNode)
    const path = `${prefixPath}/${index}`
    const wallet = this.wallet.derivePath(path)
    return {
      wallet
    } as EvmWallet
  }
}
