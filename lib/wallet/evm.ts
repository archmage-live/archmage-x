import assert from 'assert'
import { ethers } from 'ethers'

import { KEYSTORE } from '~lib/keystore'

import type { SigningWallet, WalletOpts } from './base'
import { WalletType } from './base'

export class EvmWallet implements SigningWallet {
  static defaultPathPrefix = "m/44'/60'/0'/0"
  static defaultPath = EvmWallet.defaultPathPrefix + '/0'

  private constructor(private wallet: ethers.utils.HDNode | ethers.Wallet) {}

  static async from({ id, type, path }: WalletOpts): Promise<EvmWallet> {
    const ks = await KEYSTORE.get(id)
    assert(ks)
    const mnemonic = ks.mnemonic

    let wallet
    if (type === WalletType.HD) {
      assert(!path && mnemonic)
      wallet = ethers.utils.HDNode.fromMnemonic(mnemonic.phrase)
    } else if (type === WalletType.MNEMONIC_PRIVATE_KEY) {
      assert(mnemonic)
      if (!path) {
        path = EvmWallet.defaultPath
      }
      wallet = ethers.Wallet.fromMnemonic(mnemonic.phrase, path)
    } else {
      assert(!path)
      wallet = new ethers.Wallet(ks.privateKey)
    }

    return new EvmWallet(wallet)
  }

  async derive(prefixPath: string, index: number): Promise<EvmWallet> {
    assert(this.wallet instanceof ethers.utils.HDNode)
    const path = `${prefixPath}/${index}`
    const wallet = this.wallet.derivePath(path)
    return new EvmWallet(wallet)
  }

  get address(): string {
    return this.wallet.address
  }
}
