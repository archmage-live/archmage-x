import { entropyToMnemonic } from '@ethersproject/hdnode'
import {
  KeystoreAccount,
  _KeystoreAccount
} from '@ethersproject/json-wallets/lib.esm/keystore'
import { randomBytes } from '@ethersproject/random'
import assert from 'assert'
import Dexie from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { ethers } from 'ethers'
import PQueue from 'p-queue'

import { setUnlockTime } from '~hooks/useLockTime'
import { DB, generateName, getNextField } from '~lib/db'
import { ENV } from '~lib/env'
import { KEYSTORE } from '~lib/keystore'
import { NetworkKind } from '~lib/network'
import { PASSWORD } from '~lib/password'
import { SERVICE_WORKER_CLIENT, SERVICE_WORKER_SERVER } from '~lib/rpc'
import {
  IDerivedWallet,
  getDefaultDerivedName
} from '~lib/schema/derivedWallet'
import { IWallet } from '~lib/schema/wallet'
import { IWalletInfo } from '~lib/schema/walletInfo'
import {
  WalletType,
  getDefaultPathPrefix,
  getMasterSigningWallet
} from '~lib/wallet'

export interface IWalletService {
  createPassword(password: string): Promise<void>

  checkPassword(password: string): Promise<boolean>

  existsPassword(): Promise<boolean>

  isUnlocked(): Promise<boolean>

  unlock(password: string): Promise<boolean>

  lock(): Promise<void>

  getKeystore(id: number): Promise<KeystoreAccount | undefined>

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

  getWallet(id: number): Promise<IWallet | undefined>

  getWalletInfo(id: number): Promise<IWalletInfo | undefined>

  listWallets(): Promise<IWallet[]>

  deriveSubWallets(id: number, num: number): Promise<void>

  ensureSubWalletsInfo(
    wallet: IWallet,
    networkKind: NetworkKind,
    chainId?: number | string
  ): Promise<void>
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

  async getKeystore(id: number): Promise<KeystoreAccount | undefined> {
    return KEYSTORE.get(id)
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
      sortId: await getNextField(DB.wallets),
      type,
      name: name || (await generateName(DB.wallets)),
      path,
      hash: address, // use address as hash
      createdAt: Date.now()
    } as IWallet

    return {
      wallet,
      decrypted
    }
  }

  async createWallet(wallet: IWallet, decrypted: _KeystoreAccount) {
    await DB.transaction('rw', [DB.wallets, DB.hdPaths], async () => {
      wallet.id = await DB.wallets.add(wallet)

      await this.createHdPaths(wallet.id)
    })

    await KEYSTORE.set(wallet.id!, new KeystoreAccount(decrypted))
    // time-consuming, so do not wait for it
    KEYSTORE.persist(wallet)
  }

  async updateWallet() {
    // TODO
  }

  async deleteWallet(id: number) {
    await DB.wallets.delete(id)
  }

  async getWallet(id: number): Promise<IWallet | undefined> {
    return DB.wallets.get(id)
  }

  async getWalletInfo(id: number): Promise<IWalletInfo | undefined> {
    return DB.walletInfos.get(id)
  }

  async listWallets(): Promise<IWallet[]> {
    return DB.wallets.toArray()
  }

  async deriveSubWallets(id: number, num: number) {
    const nextSortId = await getNextField(DB.derivedWallets, 'sortId', {
      key: 'masterId',
      value: id
    })
    const nextIndex = await getNextField(DB.derivedWallets, 'index', {
      key: 'masterId',
      value: id
    })
    const subWallets = [...Array(num).keys()].map((n) => {
      return {
        masterId: id,
        sortId: nextSortId + n,
        index: nextIndex + n,
        name: getDefaultDerivedName(nextIndex + n)
      } as IDerivedWallet
    })
    await DB.derivedWallets.bulkAdd(subWallets)
  }

  async ensureSubWalletsInfo(
    wallet: IWallet,
    networkKind: NetworkKind,
    chainId?: number | string
  ) {
    // time-consuming
    await ensureSubWalletsInfo(wallet, networkKind, chainId)
  }

  async ensureWalletInfo(
    wallet: IWallet,
    index: number | undefined,
    networkKind: NetworkKind,
    chainId: number | string
  ) {
    assert(
      index !== undefined
        ? wallet.type === WalletType.HD
        : wallet.type !== WalletType.HD
    )
    const signingWallet = await getMasterSigningWallet(
      wallet,
      networkKind,
      chainId
    )
    let address
    if (wallet.type === WalletType.HD) {
      const hdPath = await DB.hdPaths
        .where({ masterId: wallet.id, networkKind })
        .first()
      assert(hdPath)
      const subSigningWallet = await signingWallet.derive(hdPath.path, index!)
      address = subSigningWallet.address
    } else {
      address = signingWallet.address
    }
    const existing = await DB.walletInfos
      .where({
        masterId: wallet.id,
        index,
        networkKind,
        chainId
      })
      .first()
    if (existing) {
      return
    }
    await DB.walletInfos.add({
      masterId: wallet.id!,
      index,
      networkKind,
      chainId,
      address,
      info: {}
    })
  }

  private async createHdPaths(id: number) {
    for (const networkKind of Object.values(NetworkKind) as NetworkKind[]) {
      await DB.hdPaths.add({
        masterId: id,
        networkKind,
        path: getDefaultPathPrefix(networkKind)
      })
    }
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

export function useWallets() {
  return useLiveQuery(() => {
    return DB.wallets.orderBy('sortId').toArray()
  })
}

export function useSubWallets(walletId: number, nextSortId = 0, limit = 96) {
  return useLiveQuery(() => {
    return (
      DB.derivedWallets
        .where('[masterId+sortId]')
        // .between([walletId, nextSortId], [walletId, Dexie.maxKey])
        .between([walletId, Dexie.minKey], [walletId, Dexie.maxKey])
        // .limit(limit)
        .toArray()
    )
  }, [walletId])
}

export function useSubWalletsInfo(
  id: number,
  networkKind: NetworkKind,
  chainId: number | string
) {
  return useLiveQuery(() => {
    return DB.walletInfos
      .where('[masterId+networkKind+chainId+index]')
      .between(
        [id, networkKind, chainId, Dexie.minKey],
        [id, networkKind, chainId, Dexie.maxKey]
      )
      .toArray()
  }, [id, networkKind, chainId])
}

export function useSubWalletInfo(
  id?: number,
  networkKind?: NetworkKind,
  chainId?: number | string,
  index?: number
) {
  return useLiveQuery(() => {
    if (
      id === undefined ||
      networkKind === undefined ||
      chainId === undefined ||
      index === undefined
    ) {
      return undefined
    }
    return DB.walletInfos
      .where('[masterId+networkKind+chainId+index]')
      .equals([id, networkKind, chainId, index])
      .first()
  }, [id, networkKind, chainId, index])
}

export function useWallet(id?: number) {
  return useLiveQuery(() => {
    if (id === undefined) {
      return undefined
    }
    return DB.wallets.get(id)
  }, [id])
}

export function useSubWallet(id?: number) {
  return useLiveQuery(() => {
    if (id === undefined) {
      return undefined
    }
    return DB.derivedWallets.get(id)
  }, [id])
}

export function useHdPaths(
  walletId?: number
): Map<NetworkKind, string> | undefined {
  return useLiveQuery(async () => {
    if (walletId === undefined) {
      return undefined
    }
    const m = new Map<NetworkKind, string>()
    const hdPaths = await DB.hdPaths
      .where('masterId')
      .equals(walletId)
      .toArray()
    for (const hdPath of hdPaths) {
      m.set(hdPath.networkKind, hdPath.path)
    }
    return m
  }, [walletId])
}

export async function reorderWallets(startSortId: number, endSortId: number) {
  const clockwise = startSortId < endSortId
  const [lower, upper] = clockwise
    ? [startSortId, endSortId]
    : [endSortId, startSortId]

  await DB.transaction('rw', [DB.wallets], async () => {
    const items = await DB.wallets
      .where('sortId')
      .between(lower, upper, true, true)
      .sortBy('sortId')
    if (!items.length) {
      return
    }

    for (let i = 0; i < items.length; i++) {
      let sortId = items[i].sortId + (clockwise ? -1 : 1)
      if (sortId > upper) sortId = lower
      else if (sortId < lower) sortId = upper

      await DB.wallets.update(items[i], { sortId })
    }
  })
}

export async function reorderSubWallets(
  masterId: number,
  startSortId: number,
  endSortId: number
) {
  const clockwise = startSortId < endSortId
  const [lower, upper] = clockwise
    ? [startSortId, endSortId]
    : [endSortId, startSortId]

  await DB.transaction('rw', [DB.derivedWallets], async () => {
    const items = await DB.derivedWallets
      .where('[masterId+sortId]')
      .between([masterId, lower], [masterId, upper], true, true)
      .sortBy('sortId')
    if (!items.length) {
      return
    }

    for (let i = 0; i < items.length; i++) {
      let sortId = items[i].sortId + (clockwise ? -1 : 1)
      if (sortId > upper) sortId = lower
      else if (sortId < lower) sortId = upper

      await DB.derivedWallets.update(items[i], { sortId })
    }
  })
}

export async function ensureSubWalletsInfo(
  wallet: IWallet,
  networkKind: NetworkKind,
  chainId?: number | string
) {
  if (chainId === undefined) {
    const firstNetwork = await DB.networks
      .where('kind')
      .equals(networkKind)
      .first()
    if (firstNetwork === undefined) {
      return
    }
    chainId = firstNetwork.chainId
  }
  const signingWallet = await getMasterSigningWallet(
    wallet,
    networkKind,
    chainId
  )
  const hdPath = await DB.hdPaths
    .where({ masterId: wallet.id, networkKind })
    .first()
  assert(hdPath)

  let tick = Date.now()
  const subWallets = await DB.derivedWallets
    .where('[masterId+index]')
    .between([wallet.id, Dexie.minKey], [wallet.id, Dexie.maxKey])
    .toArray()
  if (!subWallets.length) {
    return
  }
  // console.log(`get derived wallets: ${(Date.now() - tick) / 1000}s`)
  tick = Date.now()

  const walletInfos = await DB.walletInfos
    .where('[masterId+networkKind+chainId+index]')
    .between(
      [wallet.id, networkKind, chainId, subWallets[0].index],
      [
        wallet.id,
        networkKind,
        chainId,
        subWallets[subWallets.length - 1].index
      ],
      true,
      true
    )
    .toArray()
  // console.log(`get wallets info: ${(Date.now() - tick) / 1000}s`)
  tick = Date.now()
  if (walletInfos.length === subWallets.length) {
    return
  }

  const existing = new Set()
  for (const info of walletInfos) {
    existing.add(info.index)
  }
  const bulkAdd: IWalletInfo[] = []
  const queue = new PQueue({ concurrency: 4 })
  for (const subWallet of subWallets) {
    if (existing.has(subWallet.index)) {
      continue
    }
    const _ = queue.add(async () => {
      const subSigningWallet = await signingWallet.derive(
        hdPath.path,
        subWallet.index
      )
      bulkAdd.push({
        masterId: wallet.id,
        index: subWallet.index,
        networkKind,
        chainId,
        address: subSigningWallet.address
      } as IWalletInfo)
    })
  }
  await queue.onIdle()
  console.log(`derive wallets: ${(Date.now() - tick) / 1000}s`)
  tick = Date.now()
  await DB.walletInfos.bulkAdd(bulkAdd)
  // console.log(`add wallets info: ${(Date.now() - tick) / 1000}s`)
  console.log(
    `ensured info for derived wallets: master wallet ${wallet.id}, network: ${networkKind}, chainID: ${chainId}`
  )
}
