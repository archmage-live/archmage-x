import { arrayify, hexlify } from '@ethersproject/bytes'
import { AptosAccount } from 'aptos'
import assert from 'assert'
import { sign } from 'tweetnacl'

import { HDNode, HardenedBit } from '~lib/crypto/ed25519'
import { KEYSTORE } from '~lib/keystore'
import { WalletOpts, WalletType } from '~lib/wallet/index'

export class AptosWallet {
  // TODO
  static defaultPath = "44'/60'/0'"

  wallet!: HDNode | AptosAccount

  static async from({
    id,
    type,
    path
  }: WalletOpts): Promise<AptosWallet | undefined> {
    const ks = await KEYSTORE.get(id, true)
    if (!ks) {
      return undefined
    }
    const mnemonic = ks.mnemonic

    let wallet
    if (type === WalletType.HD) {
      assert(!path && mnemonic)
      wallet = HDNode.fromMnemonic(mnemonic.phrase)
    } else if (type === WalletType.PRIVATE_KEY) {
      if (mnemonic) {
        if (!path) {
          path = AptosWallet.defaultPath
        }
        const node = HDNode.fromMnemonic(mnemonic.phrase).derivePath(path)
        wallet = new AptosAccount(arrayify(node.privateKey))
      } else {
        assert(!path)
        wallet = new AptosAccount(arrayify(ks.privateKey))
      }
    }

    return { wallet } as AptosWallet
  }

  derive(prefixPath: string, index: number): AptosWallet {
    assert(index < HardenedBit)
    assert(this.wallet instanceof HDNode)
    const path = `${prefixPath}/${index}'`
    const wallet = this.wallet.derivePath(path)
    return {
      wallet
    } as AptosWallet
  }

  private _account?: AptosAccount
  get account() {
    if (!this._account) {
      this._account =
        this.wallet instanceof HDNode
          ? new AptosAccount(arrayify(this.wallet.privateKey))
          : this.wallet
    }
    return this._account
  }

  get address() {
    return this.account.address()
  }

  get publicKey() {
    return this.account.pubKey()
  }

  get privateKey() {
    return hexlify(this.account.signingKey.secretKey.slice(0, 32))
  }

  sign(msg: Uint8Array): Uint8Array {
    return sign.detached(msg, arrayify(this.account.signingKey.secretKey))
  }

  signHex(msg: string): Uint8Array {
    return this.sign(arrayify(msg))
  }

  verify(msg: Uint8Array, sig: Uint8Array): boolean {
    return sign.detached.verify(msg, sig, this.account.signingKey.publicKey)
  }

  verifyHex(msg: string, sig: Uint8Array): boolean {
    return this.verify(arrayify(msg), sig)
  }
}
