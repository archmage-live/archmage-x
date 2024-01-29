import { arrayify, hexlify } from '@ethersproject/bytes'
import { Keypair, Transaction, VersionedTransaction } from '@solana/web3.js'
import assert from 'assert'
import bs58 from 'bs58'
import { sign } from 'tweetnacl'

import { HDNode, HardenedBit } from '~lib/crypto/ed25519'
import { DerivePosition } from '~lib/schema'

import { KeystoreSigningWallet, WalletOpts, WalletType, generatePath } from '.'

export class SolWallet implements KeystoreSigningWallet {
  static defaultPath = "m/44'/501'/0'/0'"

  private constructor(private wallet: HDNode | Keypair) {}

  static async from({
    type,
    path,
    keystore
  }: WalletOpts): Promise<SolWallet | undefined> {
    const mnemonic = keystore.mnemonic

    let wallet
    if (type === WalletType.HD || type === WalletType.KEYLESS_HD) {
      assert(!path && mnemonic)
      wallet = HDNode.fromMnemonic(mnemonic.phrase)
    } else if (
      type === WalletType.PRIVATE_KEY ||
      type === WalletType.PRIVATE_KEY_GROUP ||
      type === WalletType.KEYLESS ||
      type === WalletType.KEYLESS_GROUP
    ) {
      if (mnemonic) {
        if (!path) {
          path = SolWallet.defaultPath
        }
        const node = HDNode.fromMnemonic(mnemonic.phrase).derivePath(path)
        wallet = Keypair.fromSeed(arrayify(node.privateKey))
      } else {
        assert(!path)
        wallet = Keypair.fromSeed(arrayify(keystore.privateKey))
      }
    }
    assert(wallet)

    return new SolWallet(wallet)
  }

  async derive(
    pathTemplate: string,
    index: number,
    derivePosition?: DerivePosition
  ): Promise<SolWallet> {
    assert(index < HardenedBit)
    assert(this.wallet instanceof HDNode)
    const path = generatePath(pathTemplate, index, derivePosition)
    const wallet = this.wallet.derivePath(path)
    return new SolWallet(wallet)
  }

  get address(): string {
    return this.publicKeyBase58()
  }

  get privateKey(): string {
    return this.secretKeyBase58()
  }

  get publicKey(): string {
    return this.publicKeyBase58()
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

  async verify(msg: string | Uint8Array, sig: Uint8Array): Promise<boolean> {
    const publicKey =
      this.wallet instanceof HDNode
        ? arrayify(this.wallet.publicKey)
        : this.wallet.publicKey.toBytes()
    return sign.detached.verify(arrayify(msg), sig, publicKey)
  }

  async signTransaction(
    transaction: VersionedTransaction | Transaction
  ): Promise<VersionedTransaction | Transaction> {
    const keypair =
      this.wallet instanceof HDNode
        ? Keypair.fromSecretKey(arrayify(this.wallet.secretKey!))
        : this.wallet
    if (transaction instanceof VersionedTransaction) {
      transaction.sign([keypair])
    } else {
      transaction.sign(keypair)
    }
    return transaction
  }

  async signMessage(message: any): Promise<string> {
    return hexlify(
      sign.detached(arrayify(message), arrayify(this.wallet.secretKey!))
    )
  }

  async signTypedData(typedData: any): Promise<string> {
    throw new Error('not implemented')
  }
}
