import { hdNodeFromKeystore } from '@/archmage/crypto/secp256k1'
import assert from 'assert'
import {
  HDNodeWallet,
  TransactionRequest,
  Wallet,
  getAddress,
  getBytes
} from 'ethers'

import {
  KeystoreSigningWallet,
  WalletOpts,
  WalletType,
  generatePath
} from './index'
import { DerivePosition } from './types'

export class EvmWallet implements KeystoreSigningWallet {
  static defaultPath = "m/44'/60'/0'/0/0"

  protected constructor(public wallet: HDNodeWallet | Wallet) {}

  static async from({
    type,
    path,
    keystore
  }: WalletOpts): Promise<EvmWallet | undefined> {
    return new EvmWallet(await EvmWallet.buildWallet({ type, path, keystore }))
  }

  protected static async buildWallet({
    type,
    path,
    keystore
  }: WalletOpts): Promise<HDNodeWallet | Wallet> {
    const mnemonic = keystore.mnemonic

    let wallet
    if (type === WalletType.HD || type === WalletType.KEYLESS_HD) {
      assert(!path && mnemonic)
      wallet = hdNodeFromKeystore(keystore)
    } else if (
      type === WalletType.PRIVATE_KEY ||
      type === WalletType.PRIVATE_KEY_GROUP ||
      type === WalletType.KEYLESS ||
      type === WalletType.KEYLESS_GROUP
    ) {
      if (mnemonic) {
        wallet = hdNodeFromKeystore(keystore)
      } else {
        assert(!path)
        wallet = new Wallet(keystore.privateKey)
      }
    }
    assert(wallet)
    return wallet
  }

  async derive(
    pathTemplate: string,
    index: number,
    derivePosition?: DerivePosition
  ): Promise<EvmWallet> {
    assert(this.wallet instanceof HDNodeWallet)
    const path = generatePath(pathTemplate, index, derivePosition)
    const wallet = this.wallet.derivePath(path)
    return new EvmWallet(wallet)
  }

  get address(): string {
    return this.wallet.address
  }

  get privateKey(): string {
    return this.wallet.privateKey
  }

  get publicKey(): string {
    return this.wallet.signingKey.publicKey
  }

  get signingWallet() {
    return this.wallet
  }

  signTransaction(transaction: any): Promise<any> {
    return this.wallet.signTransaction(transaction as TransactionRequest)
  }

  signMessage(message: any): Promise<string> {
    return this.wallet.signMessage(getBytes(message as string))
  }

  async signTypedData({ domain, types, message }: any): Promise<string> {
    return this.wallet.signTypedData(domain, types, message)
  }

  static checkAddress(address: string): string | false {
    try {
      return getAddress(address)
    } catch {
      return false
    }
  }
}
