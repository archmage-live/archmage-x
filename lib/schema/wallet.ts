import type { _KeystoreAccount } from '@ethersproject/json-wallets/lib/keystore'
import { KeystoreAccount } from '@ethersproject/json-wallets/lib/keystore'
import assert from 'assert'
import { ethers } from 'ethers'

import { db, generateName, getNextSortId } from '~lib/db'
import { keystore } from '~lib/keystore'
import { WalletType } from '~lib/wallet'
import { encryptKeystore } from '~node_modules/@ethersproject/json-wallets'

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

  constructor(wallet: IWallet) {
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
      assert(mnemonic)
      ethWallet = ethers.Wallet.fromMnemonic(mnemonic, path)
      type = WalletType.MNEMONIC_PRIVATE_KEY
    } else {
      assert(!mnemonic)
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

    const encrypted = await encryptKeystore(ethWallet, password)

    const wallet = new Wallet({
      sortId: await getNextSortId(db.wallets),
      type,
      name: name || (await generateName(db.wallets)),
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

  async exists({ name, hash }: { name?: string; hash?: string }) {
    if (name) {
      return (await db.wallets.where('name').equals(this.name).count()) > 0
    }
    if (hash) {
      return (await db.wallets.where('hash').equals(this.hash).count()) > 0
    }
  }

  async create(decrypted: KeystoreAccount, encrypted: string) {
    this.id = await db.wallets.add({
      ...this,
      keystore: encrypted
    })

    keystore.set(this.id, new KeystoreAccount(decrypted))
  }

  async update() {
    // TODO
  }

  async delete() {
    await db.wallets.delete(this.id)
  }

  static async get() {
    // TODO
  }

  static async query() {
    // TODO
  }
}
