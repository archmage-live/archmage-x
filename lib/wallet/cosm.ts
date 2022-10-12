import { stringToPath } from '@cosmjs/crypto'
import { normalizeBech32 } from '@cosmjs/encoding'
import {
  AccountData,
  DirectSecp256k1HdWallet,
  DirectSecp256k1Wallet
} from '@cosmjs/proto-signing'
import assert from 'assert'
import { ethers } from 'ethers'

import { KEYSTORE } from '~lib/keystore'
import { DerivePosition } from '~lib/schema'

import { SigningWallet, WalletOpts, WalletType, generatePath } from '.'

interface AccountDataWithPrivkey extends AccountData {
  readonly privkey: Uint8Array
}

export class CosmWallet implements SigningWallet {
  static defaultPath = "m/44'/118'/0'/0/0"

  wallet!: DirectSecp256k1HdWallet | DirectSecp256k1Wallet
  mnemonic?: string
  prefix?: string

  address!: string
  privateKey!: string
  publicKey!: string

  private constructor() {}

  static async from({
    id,
    type,
    path,
    prefix
  }: WalletOpts): Promise<CosmWallet | undefined> {
    const ks = await KEYSTORE.get(id, true)
    if (!ks) {
      return undefined
    }
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
        wallet.publicKey = ethers.utils.hexlify(account.pubkey)
      } else {
        assert(!path)
        const w = await DirectSecp256k1Wallet.fromKey(
          ethers.utils.arrayify(ks.privateKey),
          prefix
        )
        wallet.wallet = w
        const account = (await w.getAccounts())[0]
        wallet.address = account.address
        wallet.privateKey = ks.privateKey
        wallet.publicKey = ethers.utils.hexlify(account.pubkey)
      }
    }
    return wallet
  }

  async derive(
    pathTemplate: string,
    index: number,
    derivePosition?: DerivePosition
  ): Promise<CosmWallet> {
    assert(this.mnemonic)
    const hdPath = stringToPath(
      generatePath(pathTemplate, index, derivePosition)
    )
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(this.mnemonic, {
      hdPaths: [hdPath],
      prefix: this.prefix
    })
    const ws = new CosmWallet()

    ws.wallet = wallet
    const account = (await (
      wallet as any
    ).getAccountsWithPrivkeys()[0]) as AccountDataWithPrivkey
    ws.address = account.address
    ws.privateKey = ethers.utils.hexlify(account.privkey)
    ws.publicKey = ethers.utils.hexlify(account.pubkey)
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

  static checkAddress(address: string): string | false {
    try {
      return normalizeBech32(address)
    } catch {
      return false
    }
  }
}
