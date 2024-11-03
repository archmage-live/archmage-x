import {
  AptosAccount,
  HexString,
  TransactionBuilderEd25519,
  TxnBuilderTypes
} from 'aptos'
import assert from 'assert'
import { getBytes, hexlify } from 'ethers'
import { sign } from 'tweetnacl'

import {
  HARDENED_OFFSET,
  HDKey,
  hdKeyFromKeystore
} from '@/archmage/crypto/ed25519'
import { DerivePosition } from './types'

import { KeystoreSigningWallet, WalletOpts, WalletType, generatePath } from './index'

export class AptosWallet implements KeystoreSigningWallet {
  static defaultPath = "m/44'/637'/0'/0'/0'"

  private constructor(private wallet: HDKey | AptosAccount) {}

  static async from({
    type,
    path,
    keystore
  }: WalletOpts): Promise<AptosWallet | undefined> {
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
        wallet = new AptosAccount(getBytes(keystore.privateKey))
      }
    }
    assert(wallet)

    return new AptosWallet(wallet)
  }

  async derive(
    pathTemplate: string,
    index: number,
    derivePosition?: DerivePosition
  ): Promise<AptosWallet> {
    assert(index < HARDENED_OFFSET)
    assert(this.wallet instanceof HDKey)
    const path = generatePath(pathTemplate, index, derivePosition)
    const wallet = this.wallet.derive(path)
    return new AptosWallet(wallet)
  }

  private _account?: AptosAccount
  get account() {
    if (!this._account) {
      this._account =
        this.wallet instanceof HDKey
          ? new AptosAccount(this.wallet.privateKey)
          : this.wallet
    }
    return this._account
  }

  get address() {
    return this.account.address().toString()
  }

  get publicKey() {
    return this.account.pubKey().toString()
  }

  get privateKey() {
    return hexlify(this.account.signingKey.secretKey.slice(0, 32))
  }

  sign(msg: Uint8Array): Uint8Array {
    return sign.detached(msg, this.account.signingKey.secretKey)
  }

  signHex(msg: string): Uint8Array {
    return this.sign(getBytes(msg))
  }

  verify(msg: Uint8Array, sig: Uint8Array): boolean {
    return sign.detached.verify(msg, sig, this.account.signingKey.publicKey)
  }

  verifyHex(msg: string, sig: Uint8Array): boolean {
    return this.verify(getBytes(msg), sig)
  }

  async signTransaction(
    transaction: TxnBuilderTypes.RawTransaction
  ): Promise<Uint8Array> {
    const txnBuilder = new TransactionBuilderEd25519(
      (signingMessage: TxnBuilderTypes.SigningMessage) => {
        const sig = this.sign(signingMessage)
        return new TxnBuilderTypes.Ed25519Signature(sig)
      },
      getBytes(this.publicKey)
    )

    return txnBuilder.sign(transaction)
  }

  async signMessage(message: any): Promise<string> {
    throw new Error('not implemented')
  }

  async signTypedData(typedData: string): Promise<string> {
    return hexlify(this.sign(Uint8Array.from(Buffer.from(typedData))))
  }

  static checkAddress(address: string): string | false {
    // TODO
    try {
      address = HexString.fromUint8Array(
        new HexString(address).toUint8Array()
      ).toString()
      assert(address.length === 66)
      return address
    } catch {
      return false
    }
  }
}
