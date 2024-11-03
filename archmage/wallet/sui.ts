import {
  HARDENED_OFFSET,
  HDKey,
  hdKeyFromKeystore
} from '@/archmage/crypto/ed25519'
import { SignatureWithBytes } from '@mysten/sui/cryptography'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import {
  isValidSuiAddress,
  normalizeSuiAddress,
  normalizeSuiObjectId
} from '@mysten/sui/utils'
import assert from 'assert'
import { getBytes, hexlify } from 'ethers'

import {
  KeystoreSigningWallet,
  WalletOpts,
  WalletType,
  generatePath
} from './base'
import { DerivePosition } from './types'

export type { SignatureWithBytes } from '@mysten/sui/cryptography'

export class SuiWallet implements KeystoreSigningWallet {
  static defaultPath = "m/44'/784'/0'/0'/0'"

  private constructor(private wallet: HDKey | Ed25519Keypair) {}

  static async from({
    type,
    path,
    keystore
  }: WalletOpts): Promise<SuiWallet | undefined> {
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
        wallet = Ed25519Keypair.fromSecretKey(getBytes(keystore.privateKey))
      }
    }
    assert(wallet)

    return new SuiWallet(wallet)
  }

  async derive(
    pathTemplate: string,
    index: number,
    derivePosition?: DerivePosition
  ): Promise<SuiWallet> {
    assert(index < HARDENED_OFFSET)
    assert(this.wallet instanceof HDKey)
    const path = generatePath(pathTemplate, index, derivePosition)
    const node = this.wallet.derive(path)
    const wallet = Ed25519Keypair.fromSecretKey(getBytes(node.privateKey))
    return new SuiWallet(wallet)
  }

  get address() {
    assert(this.wallet instanceof Ed25519Keypair)
    return this.wallet.getPublicKey().toSuiAddress()
  }

  get privateKey() {
    assert(this.wallet instanceof Ed25519Keypair)
    return hexlify((this.wallet as any).keypair.secretKey.slice(0, 32))
  }

  get publicKey() {
    assert(this.wallet instanceof Ed25519Keypair)
    return this.wallet.getPublicKey().toBase64()
  }

  async signTransaction(transaction: Uint8Array): Promise<SignatureWithBytes> {
    assert(this.wallet instanceof Ed25519Keypair)
    return this.wallet.signTransaction(transaction)
  }

  async signMessage(message: any): Promise<SignatureWithBytes> {
    assert(this.wallet instanceof Ed25519Keypair)
    return this.wallet.signPersonalMessage(getBytes(message))
  }

  async signTypedData(typedData: any): Promise<string> {
    throw new Error('not implemented')
  }

  static checkAddress(address: string): string | false {
    try {
      if (!isValidSuiAddress(address)) {
        return false
      }
      return normalizeSuiAddress(address)
    } catch {
      return false
    }
  }
}
