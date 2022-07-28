import { encryptKeystore } from '@ethersproject/json-wallets'
import type { _KeystoreAccount } from '@ethersproject/json-wallets/lib/keystore'
import { KeystoreAccount } from '@ethersproject/json-wallets/lib/keystore'
import assert from 'assert'
import { ethers } from 'ethers'

import { DB, generateName, getNextSortId } from '~lib/db'
import { KEYSTORE } from '~lib/keystore'
import { WalletType } from '~lib/wallet'

export interface IWallet {
  id?: number
  sortId: number
  type: WalletType
  name: string // unique
  path?: string
  hash: string // ensure the uniqueness of secret phrase
  keystore?: string // encrypted keystore
}

// unique name, unique hash
export const walletSchemaV1 = '++id, sortId, walletType, &name, &hash'

export class Wallet implements IWallet {
  id!: number
  sortId!: number
  type!: WalletType
  name!: string
  path?: string
  hash!: string
  keystore?: string

  private constructor(wallet: IWallet) {
    Object.assign(this, wallet)
  }

  static async new({
    password,
    isHD,
    mnemonic,
    path,
    privateKey,
    name
  }: {
    password: string
    isHD: boolean
    mnemonic?: string
    path?: string
    privateKey?: string
    name?: string
  }) {
    let ethWallet
    let type
    if (isHD) {
      assert(mnemonic && !path && !privateKey)
      ethWallet = ethers.utils.HDNode.fromMnemonic(mnemonic)
      type = WalletType.HD
    } else if (!privateKey) {
      assert(mnemonic && path)
      ethWallet = ethers.Wallet.fromMnemonic(mnemonic, path)
      type = WalletType.MNEMONIC_PRIVATE_KEY
    } else {
      assert(!mnemonic && !path)
      ethWallet = new ethers.Wallet(privateKey)
      type = WalletType.PRIVATE_KEY
    }

    const address = ethWallet.address

    const decrypted: _KeystoreAccount = {
      address,
      privateKey: ethWallet.privateKey,
      mnemonic: ethWallet.mnemonic,
      _isKeystoreAccount: true
    }

    // time-consuming encrypting
    const encrypted = await encryptKeystore(ethWallet, password)

    const wallet = new Wallet({
      sortId: await getNextSortId(DB.wallets),
      type,
      name: name || (await generateName(DB.wallets)),
      path,
      hash: address // use address as hash
    })

    return {
      wallet,
      keystore: {
        encrypted,
        decrypted
      }
    }
  }

  static async exists({ name, hash }: { name?: string; hash?: string }) {
    if (name) {
      return (await DB.wallets.where('name').equals(name).count()) > 0
    }
    if (hash) {
      return (await DB.wallets.where('hash').equals(hash).count()) > 0
    }
  }

  async create(decrypted: _KeystoreAccount, encrypted: string) {
    this.id = await DB.wallets.add({
      ...this,
      keystore: encrypted
    })

    KEYSTORE.set(this.id, new KeystoreAccount(decrypted))
  }

  async update() {
    // TODO
  }

  async delete() {
    await DB.wallets.delete(this.id)
  }

  static async get() {
    // TODO
  }

  static async query() {
    // TODO
  }
}
