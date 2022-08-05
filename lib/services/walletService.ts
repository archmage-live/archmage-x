import { entropyToMnemonic } from '@ethersproject/hdnode'
import {
  KeystoreAccount,
  _KeystoreAccount
} from '@ethersproject/json-wallets/lib.esm/keystore'
import { randomBytes } from '@ethersproject/random'
import assert from 'assert'
import { ethers } from 'ethers'

import { setUnlockTime } from '~hooks/useLockTime'
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
    isHD: boolean
    mnemonic?: string
    path?: string
    privateKey?: string
    name?: string
  }): Promise<{
    wallet: IWallet
    decrypted: _KeystoreAccount
  }>

  existsName(name: string): Promise<boolean>

  existsSecret(wallet: IWallet): Promise<boolean>

  createWallet(wallet: IWallet, decrypted: _KeystoreAccount): Promise<void>

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
    await PASSWORD.create(password)
    await setUnlockTime()
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
      await setUnlockTime()
      KEYSTORE.unlock()
    }

    return unlocked
  }

  async lock() {
    await PASSWORD.lock()
    await KEYSTORE.lock()
  }

  async newWallet({
    isHD,
    mnemonic,
    path,
    privateKey,
    name
  }: {
    isHD: boolean
    mnemonic?: string
    path?: string
    privateKey?: string
    name?: string
  }): Promise<{
    wallet: IWallet
    decrypted: _KeystoreAccount
  }> {
    let account
    let type
    if (isHD) {
      assert(mnemonic && !path && !privateKey)
      account = ethers.utils.HDNode.fromMnemonic(mnemonic)
      type = WalletType.HD
    } else if (!privateKey) {
      assert(mnemonic && path)
      account = ethers.Wallet.fromMnemonic(mnemonic, path)
      type = WalletType.MNEMONIC_PRIVATE_KEY
    } else {
      assert(!mnemonic && !path)
      account = new ethers.Wallet(privateKey)
      type = WalletType.PRIVATE_KEY
    }

    const address = account.address

    const decrypted: _KeystoreAccount = {
      address,
      privateKey: account.privateKey,
      mnemonic: account.mnemonic,
      _isKeystoreAccount: true
    }

    const wallet = {
      sortId: await getNextSortId(DB.wallets),
      type,
      name: name || (await generateName(DB.wallets)),
      path,
      hash: address // use address as hash
    } as IWallet

    return {
      wallet,
      decrypted
    }
  }

  async createWallet(wallet: IWallet, decrypted: _KeystoreAccount) {
    wallet.id = await DB.wallets.add(wallet)

    await KEYSTORE.set(wallet.id, new KeystoreAccount(decrypted))
    // time-consuming, so do not wait for it
    KEYSTORE.persist(wallet)
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
