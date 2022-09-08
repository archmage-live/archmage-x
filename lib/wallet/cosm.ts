import { stringToPath } from '@cosmjs/crypto'
import {
  AccountData,
  DirectSecp256k1HdWallet,
  DirectSecp256k1Wallet
} from '@cosmjs/proto-signing'
import assert from 'assert'
import { ethers } from 'ethers'

import { KEYSTORE } from '~lib/keystore'

import type { SigningWallet, WalletOpts } from './base'
import { WalletType } from './base'

interface AccountDataWithPrivkey extends AccountData {
  readonly privkey: Uint8Array
}

export class CosmWallet implements SigningWallet {
  static defaultPathPrefix = "m/44'/118'/0'/0"
  static defaultPath = CosmWallet.defaultPathPrefix + '/0'

  wallet!: DirectSecp256k1HdWallet | DirectSecp256k1Wallet
  mnemonic?: string
  prefix?: string

  address!: string
  privateKey!: string

  private constructor() {}

  static async from({
    id,
    type,
    path,
    prefix
  }: WalletOpts): Promise<CosmWallet> {
    const ks = await KEYSTORE.get(id)
    assert(ks)
    const mnemonic = ks.mnemonic

    const wallet = new CosmWallet()
    if (type === WalletType.HD) {
      assert(!path && mnemonic)
      wallet.mnemonic = mnemonic.phrase
      wallet.prefix = prefix
    } else if (type === WalletType.PRIVATE_KEY) {
      if (mnemonic) {
        if (!path) {
          path = CosmWallet.defaultPath
        }
        const w = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic.phrase, {
          hdPaths: [stringToPath(path)],
          prefix
        })
        wallet.wallet = w
        const account = (await (
          w as any
        ).getAccountsWithPrivkeys()[0]) as AccountDataWithPrivkey
        wallet.address = account.address
        wallet.privateKey = ethers.utils.hexlify(account.privkey)
      } else {
        assert(!path)
        const w = await DirectSecp256k1Wallet.fromKey(
          ethers.utils.arrayify(ks.privateKey),
          prefix
        )
        wallet.wallet = w
        wallet.address = (await w.getAccounts())[0].address
        wallet.privateKey = ks.privateKey
      }
    }
    return wallet
  }

  async derive(prefixPath: string, index: number): Promise<CosmWallet> {
    assert(this.mnemonic)
    const hdPath = stringToPath(`${prefixPath}/${index}`)
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(this.mnemonic, {
      hdPaths: [hdPath],
      prefix: this.prefix
    })
    const ws = new CosmWallet()
    ws.address = (await wallet.getAccounts())[0].address
    return ws
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
