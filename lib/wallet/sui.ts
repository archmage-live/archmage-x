import { arrayify } from '@ethersproject/bytes'
import {
  Ed25519Keypair,
  Provider,
  RawSigner,
  SignerWithProvider
} from '@mysten/sui.js'
import assert from 'assert'

import { HDNode, HardenedBit } from '~lib/crypto/ed25519'
import { KEYSTORE } from '~lib/keystore'
import { WalletOpts, WalletType } from '~lib/wallet'

export class SuiWallet {
  // TODO
  static defaultPath = "44'/60'/0'"

  wallet!: HDNode | Ed25519Keypair

  static async from({ id, type, path }: WalletOpts): Promise<SuiWallet> {
    const ks = await KEYSTORE.get(id, true)
    assert(ks)
    const mnemonic = ks.mnemonic

    let wallet
    if (type === WalletType.HD) {
      assert(!path && mnemonic)
      wallet = HDNode.fromMnemonic(mnemonic.phrase)
    } else if (type === WalletType.PRIVATE_KEY) {
      if (mnemonic) {
        if (!path) {
          path = SuiWallet.defaultPath
        }
        const node = HDNode.fromMnemonic(mnemonic.phrase).derivePath(path)
        wallet = Ed25519Keypair.fromSecretKey(arrayify(node.secretKey!))
      } else {
        assert(!path)
        wallet = Ed25519Keypair.fromSeed(arrayify(ks.privateKey))
      }
    }

    return { wallet } as SuiWallet
  }

  derive(prefixPath: string, index: number): SuiWallet {
    assert(index < HardenedBit)
    assert(this.wallet instanceof HDNode)
    const path = `${prefixPath}/${index}'`
    const node = this.wallet.derivePath(path)
    const wallet = Ed25519Keypair.fromSecretKey(arrayify(node.secretKey!))
    return {
      wallet
    } as SuiWallet
  }

  connect(provider: Provider): SignerWithProvider {
    assert(this.wallet instanceof Ed25519Keypair)
    return new RawSigner(this.wallet, provider)
  }
}
