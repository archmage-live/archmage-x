import { arrayify, joinSignature } from '@ethersproject/bytes'
import { _TypedDataEncoder } from '@ethersproject/hash'
import { TransactionRequest } from '@ethersproject/providers'
import assert from 'assert'
import { ethers } from 'ethers'

import { DerivePosition } from '~lib/schema'

import { KeystoreSigningWallet, WalletOpts, WalletType, generatePath } from '.'

export class EvmWallet implements KeystoreSigningWallet {
  static defaultPath = "m/44'/60'/0'/0/0"

  protected constructor(
    public wallet: ethers.utils.HDNode | ethers.Wallet
  ) {}

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
  }: WalletOpts): Promise<ethers.utils.HDNode | ethers.Wallet> {
    const mnemonic = keystore.mnemonic

    let wallet
    if (type === WalletType.HD || type === WalletType.KEYLESS_HD) {
      assert(!path && mnemonic)
      wallet = ethers.utils.HDNode.fromMnemonic(mnemonic.phrase)
    } else if (
      type === WalletType.PRIVATE_KEY ||
      type === WalletType.PRIVATE_KEY_GROUP ||
      type === WalletType.KEYLESS ||
      type === WalletType.KEYLESS_GROUP
    ) {
      if (mnemonic) {
        if (!path) {
          path = EvmWallet.defaultPath
        }
        wallet = ethers.Wallet.fromMnemonic(mnemonic.phrase, path)
      } else {
        assert(!path)
        wallet = new ethers.Wallet(keystore.privateKey)
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
    assert(this.wallet instanceof ethers.utils.HDNode)
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
    return this.wallet.publicKey
  }

  get signingWallet() {
    return this.wallet instanceof ethers.utils.HDNode
      ? new ethers.Wallet(this.wallet)
      : this.wallet
  }

  signTransaction(transaction: any): Promise<any> {
    return this.signingWallet.signTransaction(transaction as TransactionRequest)
  }

  signMessage(message: any): Promise<string> {
    return this.signingWallet.signMessage(arrayify(message as string))
  }

  async signTypedData({ domain, types, message }: any): Promise<string> {
    return joinSignature(
      this.signingWallet
        ._signingKey()
        .signDigest(_TypedDataEncoder.hash(domain, types, message))
    )
  }

  static checkAddress(address: string): string | false {
    try {
      return ethers.utils.getAddress(address)
    } catch {
      return false
    }
  }
}
