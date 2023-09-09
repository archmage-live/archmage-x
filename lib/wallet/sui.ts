import { arrayify, hexlify } from '@ethersproject/bytes'
import { SerializedSignature } from '@mysten/sui.js/cryptography'
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519'
import { isValidSuiAddress, normalizeSuiAddress } from '@mysten/sui.js/utils'
import assert from 'assert'

import { HDNode, HardenedBit } from '~lib/crypto/ed25519'
import { DerivePosition } from '~lib/schema'

import {
  KeystoreSigningWallet,
  WalletOpts,
  WalletType,
  generatePath
} from './base'

export interface SignatureWithBytes {
  bytes: string
  signature: SerializedSignature
}

export class SuiWallet implements KeystoreSigningWallet {
  static defaultPath = "m/44'/784'/0'/0'/0'"

  private constructor(private wallet: HDNode | Ed25519Keypair) {}

  static async from({
    type,
    path,
    keystore
  }: WalletOpts): Promise<SuiWallet | undefined> {
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
          path = SuiWallet.defaultPath
        }
        const node = HDNode.fromMnemonic(mnemonic.phrase).derivePath(path)
        wallet = Ed25519Keypair.fromSecretKey(arrayify(node.privateKey))
      } else {
        assert(!path)
        wallet = Ed25519Keypair.fromSecretKey(arrayify(keystore.privateKey))
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
    assert(index < HardenedBit)
    assert(this.wallet instanceof HDNode)
    const path = generatePath(pathTemplate, index, derivePosition)
    const node = this.wallet.derivePath(path)
    const wallet = Ed25519Keypair.fromSecretKey(arrayify(node.privateKey))
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
    return this.wallet.getPublicKey().toString()
  }

  async signTransaction(transaction: Uint8Array): Promise<SignatureWithBytes> {
    assert(this.wallet instanceof Ed25519Keypair)
    return this.wallet.signTransactionBlock(transaction)
  }

  async signMessage(message: any): Promise<SignatureWithBytes> {
    assert(this.wallet instanceof Ed25519Keypair)
    return this.wallet.signPersonalMessage(arrayify(message))
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
