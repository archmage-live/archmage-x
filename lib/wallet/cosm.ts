import { stringToPath } from '@cosmjs/crypto'
import assert from 'assert'
import { ethers } from 'ethers'

import { keystore } from '~lib/keystore'
import type { WalletOpts } from '~lib/wallet/index'
import { WalletType } from '~lib/wallet/index'
import {
  DirectSecp256k1HdWallet,
  DirectSecp256k1Wallet
} from '~node_modules/@cosmjs/proto-signing'

export class CosmWallet {
  wallet!: DirectSecp256k1HdWallet | DirectSecp256k1Wallet
  mnemonic?: string
  prefix?: string

  static async from({
    id,
    type,
    path,
    prefix
  }: WalletOpts): Promise<CosmWallet> {
    const ks = await keystore.get(id)
    assert(ks)
    const mnemonic = ks.mnemonic

    const wallet = {} as CosmWallet
    if (type === WalletType.HD) {
      assert(!path && mnemonic)
      wallet.mnemonic = mnemonic.phrase
      wallet.prefix = prefix
    } else if (type === WalletType.MNEMONIC_PRIVATE_KEY) {
      assert(mnemonic)
      wallet.wallet = await DirectSecp256k1HdWallet.fromMnemonic(
        mnemonic.phrase,
        {
          hdPaths: path ? [stringToPath(path)] : undefined,
          prefix
        }
      )
    } else {
      assert(!path)
      wallet.wallet = await DirectSecp256k1Wallet.fromKey(
        ethers.utils.arrayify(ks.privateKey),
        prefix
      )
    }
    return wallet
  }

  async derive(prefixPath: string, index: number): Promise<CosmWallet> {
    assert(this.mnemonic)
    const hdPath = stringToPath(`${prefixPath}/${index}`)
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(this.mnemonic, {
      hdPaths: [hdPath],
      prefix: this.prefix
    })
    return {
      wallet
    } as CosmWallet
  }
}
