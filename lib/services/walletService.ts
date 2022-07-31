import { entropyToMnemonic } from '@ethersproject/hdnode'
import { encryptKeystore } from '@ethersproject/json-wallets'
import {
  KeystoreAccount,
  _KeystoreAccount
} from '@ethersproject/json-wallets/lib.esm/keystore'
import { randomBytes } from '@ethersproject/random'
import { sha256 } from '@ethersproject/sha2'
import assert from 'assert'
import { ethers } from 'ethers'

import { DB, generateName, getNextSortId } from '~lib/db'
import { KEYSTORE } from '~lib/keystore'
import { IWallet } from '~lib/schema/wallet'
import { STORE, StoreKey } from '~lib/store'
import { WalletType } from '~lib/wallet'

class WalletService {
  password!: string

  async createPassword(password: string) {
    await STORE.set(
      StoreKey.PASSWORD_HASH,
      sha256(new TextEncoder().encode(password))
    )
    this.password = password
  }

  async checkPassword(password: string): Promise<boolean> {
    return (
      sha256(new TextEncoder().encode(password)) ===
      (await STORE.get(StoreKey.PASSWORD_HASH))
    )
  }

  generateMnemonic(opts?: { locale?: string }) {
    let entropy: Uint8Array = randomBytes(16)
    return entropyToMnemonic(entropy, opts?.locale)
  }

  async newWallet({
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
  }): Promise<{
    wallet: IWallet
    decrypted: _KeystoreAccount
    encrypted: Promise<string>
  }> {
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
    const encrypted = encryptKeystore(ethWallet, password)

    const wallet = {
      sortId: await getNextSortId(DB.wallets),
      type,
      name: name || (await generateName(DB.wallets)),
      path,
      hash: address // use address as hash
    } as IWallet

    return {
      wallet,
      decrypted,
      encrypted
    }
  }

  async existsName(name: string) {
    return (await DB.wallets.where('name').equals(name).count()) > 0
  }

  async existsSecret(wallet: IWallet) {
    return (await DB.wallets.where('hash').equals(wallet.hash).count()) > 0
  }

  async createWallet(
    wallet: IWallet,
    decrypted: _KeystoreAccount,
    encrypted: Promise<string>
  ) {
    wallet.keystore = await encrypted
    wallet.id = await DB.wallets.add(wallet)

    KEYSTORE.set(wallet.id, new KeystoreAccount(decrypted))
  }

  async updateWallet() {
    // TODO
  }

  async deleteWallet(id: number) {
    await DB.wallets.delete(id)
  }

  async getWallet() {
    // TODO
  }

  async listWallets(): Promise<IWallet[]> {
    return DB.wallets.toArray()
  }
}

export const WALLET_SERVICE = new WalletService()
