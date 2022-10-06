import { Keypair } from '@solana/web3.js'
import assert from 'assert'
import bs58 from 'bs58'
import { arrayify } from 'ethers/lib/utils'
import { sign } from 'tweetnacl'

import { HDNode, HardenedBit } from '~lib/crypto/ed25519'
import { KEYSTORE } from '~lib/keystore'

import type { SigningWallet, WalletOpts } from './base'
import { WalletType } from './base'

export class SolWallet implements SigningWallet {
  static defaultPathPrefix = "m/44'/501'/0'"
  static defaultPath = SolWallet.defaultPathPrefix + "/0'"

  private constructor(private wallet: HDNode | Keypair) {}

  static async from({
    id,
    type,
    path
  }: WalletOpts): Promise<SolWallet | undefined> {
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
          path = SolWallet.defaultPath
        }
        const node = HDNode.fromMnemonic(mnemonic.phrase).derivePath(path)
        wallet = Keypair.fromSeed(arrayify(node.privateKey))
      } else {
        assert(!path)
        wallet = Keypair.fromSeed(arrayify(ks.privateKey))
      }
    }
    assert(wallet)

    return new SolWallet(wallet)
  }

  async derive(prefixPath: string, index: number): Promise<SolWallet> {
    assert(index < HardenedBit)
    assert(this.wallet instanceof HDNode)
    const path = `${prefixPath}/${index}'`
    const wallet = this.wallet.derivePath(path)
    return new SolWallet(wallet)
  }

  get address(): string {
    return this.publicKeyBase58()
  }

  get privateKey(): string {
    // TODO
    throw new Error('not implemented')
  }

  publicKeyBase58(): string {
    if (this.wallet instanceof HDNode) {
      return bs58.encode(arrayify(this.wallet.publicKey))
    } else {
      return this.wallet.publicKey.toBase58()
    }
  }

  secretKeyBase58(): string {
    return bs58.encode(arrayify(this.wallet.secretKey!))
  }

  // https://github.com/solana-labs/solana-web3.js/blob/master/src/transaction.ts
  sign(msg: Uint8Array): Uint8Array {
    return sign.detached(msg, arrayify(this.wallet.secretKey!))
  }

  signHex(msg: string): Uint8Array {
    return this.sign(arrayify(msg))
  }

  verify(msg: Uint8Array, sig: Uint8Array): boolean {
    const publicKey =
      this.wallet instanceof HDNode
        ? arrayify(this.wallet.publicKey)
        : this.wallet.publicKey.toBytes()
    return sign.detached.verify(msg, sig, publicKey)
  }

  verifyHex(msg: string, sig: Uint8Array): boolean {
    return this.verify(arrayify(msg), sig)
  }

  async signTransaction(transaction: any): Promise<string> {
    // TODO
    throw new Error('not implemented')
  }

  async signMessage(message: any): Promise<string> {
    // TODO
    throw new Error('not implemented')
  }

  async signTypedData(typedData: any): Promise<string> {
    // TODO
    throw new Error('not implemented')
  }
}
