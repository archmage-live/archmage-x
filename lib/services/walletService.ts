import { entropyToMnemonic } from '@ethersproject/hdnode'
import { encryptKeystore } from '@ethersproject/json-wallets'
import {
  KeystoreAccount,
  _KeystoreAccount
} from '@ethersproject/json-wallets/lib.esm/keystore'
import { randomBytes } from '@ethersproject/random'
import assert from 'assert'
import { ethers } from 'ethers'

import { DB, generateName, getNextSortId } from '~lib/db'
import { ENV } from '~lib/env'
import { KEYSTORE } from '~lib/keystore'
import { PASSWORD } from '~lib/password'
import { SERVICE_WORKER_CLIENT, SERVICE_WORKER_SERVER } from '~lib/rpc'
import { IWallet } from '~lib/schema/wallet'
import { WalletType } from '~lib/wallet'

export interface IWalletService {
  createPassword(password: string): Promise<void>

  checkPassword(password: string): Promise<boolean>

  existsPassword(): Promise<boolean>

  isUnlocked(): Promise<boolean>

  unlock(password: string): Promise<boolean>

  lock(): Promise<void>

  generateMnemonic(opts?: { locale?: string }): Promise<string>

  newWallet(opts: {
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
  }>

  existsName(name: string): Promise<boolean>

  existsSecret(wallet: IWallet): Promise<boolean>

  createWallet(
    wallet: IWallet,
    decrypted: _KeystoreAccount,
    encrypted: Promise<string>
  ): Promise<void>

  updateWallet(): Promise<void>

  deleteWallet(id: number): Promise<void>

  getWallet(): Promise<void>

  listWallets(): Promise<IWallet[]>
}

// @ts-ignore
class WalletServicePartial implements IWalletService {
  async generateMnemonic(opts?: { locale?: string }) {
    let entropy: Uint8Array = randomBytes(16)
    return entropyToMnemonic(entropy, opts?.locale)
  }

  async existsName(name: string) {
    return (await DB.wallets.where('name').equals(name).count()) > 0
  }

  async existsSecret(wallet: IWallet) {
    return (await DB.wallets.where('hash').equals(wallet.hash).count()) > 0
  }
}

class WalletService extends WalletServicePartial {
  async createPassword(password: string) {
    return PASSWORD.create(password)
  }

  async checkPassword(password: string): Promise<boolean> {
    return PASSWORD.check(password)
  }

  async existsPassword() {
    return PASSWORD.exists()
  }

  async isUnlocked() {
    return PASSWORD.isUnlocked()
  }

  async unlock(password: string) {
    const unlocked = await PASSWORD.unlock(password)

    if (unlocked) {
      // TODO
      KEYSTORE.unlock()
        .then(() => {
          console.log('Unlock wallets succeeded')
        })
        .catch(() => {
          console.error('Unlock wallets failed')
        })
    }

    return unlocked
  }

  async lock() {
    await PASSWORD.lock()
    await KEYSTORE.lock()
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

function createWalletService(): IWalletService {
  const serviceName = 'walletService'
  let service
  if (ENV.inServiceWorker) {
    service = new WalletService()
    SERVICE_WORKER_SERVER.registerService(serviceName, service)
  } else {
    service = SERVICE_WORKER_CLIENT.service<IWalletService>(
      serviceName,
      // @ts-ignore
      new WalletServicePartial()
    )
  }
  return service
}

export const WALLET_SERVICE = createWalletService()
