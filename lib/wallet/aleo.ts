import { Account, Address } from '@aleohq/sdk'
import { wasm } from '@aleohq/wasm'
import { arrayify } from '@ethersproject/bytes'
import assert from 'assert'
import { ethers } from 'ethers'
import browser from 'webextension-polyfill'

import { DerivePosition } from '~lib/schema'

import {
  KeystoreSigningWallet,
  WalletOpts,
  WalletType,
  generatePath
} from './base'

export class AleoWallet implements KeystoreSigningWallet {
  static defaultPath = "m/44'/683'/0'/0/0"

  static initialized = false

  static async init() {
    if (!AleoWallet.initialized) {
      AleoWallet.initialized = true
      await wasm({
        importHook: (path) =>
          browser.runtime.getURL(`node_modules/@aleohq/wasm/dist/${path}`)
      })
    }
  }

  private account: Account

  private constructor(private wallet: ethers.utils.HDNode | ethers.Wallet) {
    this.account = new Account({
      seed: arrayify(wallet.privateKey)
    })
  }

  static async from({
    type,
    path,
    keystore
  }: WalletOpts): Promise<AleoWallet | undefined> {
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
          path = AleoWallet.defaultPath
        }
        wallet = ethers.Wallet.fromMnemonic(mnemonic.phrase, path)
      } else {
        assert(!path)
        wallet = new ethers.Wallet(keystore.privateKey)
      }
    }
    assert(wallet)

    await AleoWallet.init()

    return new AleoWallet(wallet)
  }

  async derive(
    pathTemplate: string,
    index: number,
    derivePosition?: DerivePosition
  ): Promise<AleoWallet> {
    assert(this.wallet instanceof ethers.utils.HDNode)
    const path = generatePath(pathTemplate, index, derivePosition)
    const wallet = this.wallet.derivePath(path)
    return new AleoWallet(wallet)
  }

  get address(): string {
    return this.account.address().to_string()
  }

  get privateKey(): string {
    return this.account.privateKey().to_string()
  }

  get publicKey(): string {
    // Aleo does not have a public key
    return ''
  }

  async signTransaction(transaction: any): Promise<any> {
    throw new Error('not implemented')
  }

  async signMessage(message: any): Promise<string> {
    return this.account.sign(arrayify(message)).to_string()
  }

  async signTypedData(typedData: any): Promise<string> {
    throw new Error('not implemented')
  }

  static checkAddress(address: string): string | false {
    try {
      return Address.from_string(address).to_string()
    } catch {
      return false
    }
  }
}
