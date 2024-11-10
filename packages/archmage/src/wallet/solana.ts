import {
  HARDENED_OFFSET,
  HDKey,
  hdKeyFromKeystore
} from '@/archmage/crypto/ed25519'
import { Keypair, Transaction, VersionedTransaction } from '@solana/web3.js'
import assert from 'assert'
import bs58 from 'bs58'
import { getBytes, hexlify } from 'ethers'
import { sign } from 'tweetnacl'

import {
  KeystoreSigningWallet,
  WalletOpts,
  WalletType,
  generatePath
} from './index'
import { DerivePosition } from './types'

export class SolWallet implements KeystoreSigningWallet {
  static defaultPath = "m/44'/501'/0'/0'"

  private constructor(private wallet: HDKey | Keypair) {}

  static async from({
    type,
    path,
    keystore
  }: WalletOpts): Promise<SolWallet | undefined> {
    const mnemonic = keystore.mnemonic

    let wallet
    if (type === WalletType.HD || type === WalletType.KEYLESS_HD) {
      assert(!path && mnemonic)
      wallet = hdKeyFromKeystore(keystore)
    } else if (
      type === WalletType.PRIVATE_KEY ||
      type === WalletType.PRIVATE_KEY_GROUP ||
      type === WalletType.KEYLESS ||
      type === WalletType.KEYLESS_GROUP
    ) {
      if (mnemonic) {
        wallet = hdKeyFromKeystore(keystore)
      } else {
        assert(!path)
        wallet = Keypair.fromSeed(getBytes(keystore.privateKey))
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
    assert(index < HARDENED_OFFSET)
    assert(this.wallet instanceof HDKey)
    const path = generatePath(pathTemplate, index, derivePosition)
    const wallet = this.wallet.derive(path)
    return new SolWallet(wallet)
  }

  get address(): string {
    return this.publicKeyBase58
  }

  get privateKey(): string {
    return this.secretKeyBase58
  }

  get publicKey(): string {
    return this.publicKeyBase58
  }

  get publicKeyBytes(): Uint8Array {
    if (this.wallet instanceof HDKey) {
      return this.wallet.publicKeyRaw
    } else {
      return this.wallet.publicKey.toBytes()
    }
  }

  get publicKeyBase58(): string {
    return bs58.encode(this.publicKeyBytes)
  }

  get secretKeyBase58(): string {
    return bs58.encode(this.secretKey)
  }

  get secretKey() {
    if (this.wallet instanceof HDKey) {
      return Keypair.fromSeed(this.wallet.privateKey).secretKey
    } else {
      return this.wallet.secretKey
    }
  }

  private get keyPair() {
    return this.wallet instanceof HDKey
      ? Keypair.fromSeed(this.wallet.privateKey)
      : this.wallet
  }

  async verify(msg: string | Uint8Array, sig: Uint8Array): Promise<boolean> {
    return sign.detached.verify(getBytes(msg), sig, this.publicKeyBytes)
  }

  async signTransaction(
    transaction: VersionedTransaction | Transaction
  ): Promise<VersionedTransaction | Transaction> {
    if (transaction instanceof VersionedTransaction) {
      transaction.sign([this.keyPair])
    } else {
      transaction.sign(this.keyPair)
    }
    return transaction
  }

  async signMessage(message: any): Promise<string> {
    return hexlify(sign.detached(getBytes(message), this.secretKey))
  }

  async signTypedData(typedData: any): Promise<string> {
    throw new Error('not implemented')
  }
}
