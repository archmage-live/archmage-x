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

import { DB, getNextField } from '~lib/db'
import { ENV } from '~lib/env'
import { KEYSTORE } from '~lib/keystore'
import { NetworkKind } from '~lib/network'
import { SERVICE_WORKER_CLIENT, SERVICE_WORKER_SERVER } from '~lib/rpc'
import {
  ChainAccountIndex,
  ChainId,
  IChainAccountAux,
  IHdPath,
  Index,
  PSEUDO_INDEX,
  SubIndex,
  generateDefaultWalletName
} from '~lib/schema'
import { IChainAccount } from '~lib/schema/chainAccount'
import { ISubWallet, getDefaultSubName } from '~lib/schema/subWallet'
import { IWallet } from '~lib/schema/wallet'
import {
  SigningWallet,
  WalletType,
  getDefaultPathPrefix,
  getMasterSigningWallet,
  hasWalletKeystore,
  isWalletGroup
} from '~lib/wallet'

export type NewWalletOpts = {
  name?: string
  type: WalletType
  mnemonic?: string
  path?: string
  privateKey?: string
  networkKind?: NetworkKind
  addresses?: string[]
}

function checkAddresses(
  networkKind: NetworkKind,
  addresses: string[]
): string[] {
  switch (networkKind) {
    case NetworkKind.EVM:
      return addresses.map((addr) => ethers.utils.getAddress(addr))
    default:
      throw new Error('unknown address type')
  }
}

export interface IWalletService {
  getKeystore(id: number): Promise<KeystoreAccount | undefined>

  generateMnemonic(opts?: { locale?: string }): Promise<string>

  newWallet(opts: NewWalletOpts): Promise<{
    wallet: IWallet
    decrypted?: _KeystoreAccount
  }>

  existsName(name: string): Promise<boolean>

  existsSecret(wallet: IWallet): Promise<boolean>

  createWallet(wallet: IWallet, decrypted?: _KeystoreAccount): Promise<void>

  updateWallet(): Promise<void>

  deleteWallet(id: number): Promise<void>

  getWallet(id: number): Promise<IWallet | undefined>

  getSubWallet(id: number | SubIndex): Promise<ISubWallet | undefined>

  getChainAccount(
    id: number | ChainAccountIndex
  ): Promise<IChainAccount | undefined>

  getChainAccounts(
    ids: (number | ChainAccountIndex)[]
  ): Promise<IChainAccount[]>

  getSubWallets(id: number): Promise<ISubWallet[]>

  getWallets(): Promise<IWallet[]>

  deriveSubWallets(id: number, num: number): Promise<ISubWallet[]>

  ensureChainAccounts(
    wallet: IWallet | number,
    networkKind: NetworkKind,
    chainId: ChainId
  ): Promise<void>

  ensureChainAccount(
    wallet: IWallet,
    index: Index,
    networkKind: NetworkKind,
    chainId: ChainId
  ): Promise<IChainAccount | undefined>
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

  async getWallet(id: number): Promise<IWallet | undefined> {
    return DB.wallets.get(id)
  }

  async getSubWallet(id: number | SubIndex): Promise<ISubWallet | undefined> {
    if (typeof id === 'number') {
      return DB.subWallets.get(id)
    } else {
      return DB.subWallets.where(id).first()
    }
  }

  async getChainAccount(
    id: number | ChainAccountIndex
  ): Promise<IChainAccount | undefined> {
    if (typeof id === 'number') {
      return DB.chainAccounts.get(id)
    } else {
      const wallet = await this.getWallet(id.masterId)
      assert(wallet)
      return this._ensureChainAccount(
        wallet,
        id.index,
        id.networkKind,
        id.chainId
      )
    }
  }

  async getChainAccounts(
    ids: (number | ChainAccountIndex)[]
  ): Promise<IChainAccount[]> {
    if (!ids.length) {
      return []
    }
    let wallets
    if (typeof ids[0] === 'number') {
      wallets = await DB.chainAccounts
        .where('id')
        .anyOf(ids as number[])
        .toArray()
    } else {
      // NOTE: no ensureChainAccounts here
      const anyOf = (ids as ChainAccountIndex[]).map(
        ({ masterId, index, networkKind, chainId }) => [
          masterId,
          index,
          networkKind,
          chainId
        ]
      )
      wallets = await DB.chainAccounts
        .where('[masterId+index+networkKind+chainId]')
        .anyOf(anyOf)
        .toArray()
    }
    assert(wallets.length === ids.length)
    return wallets
  }

  async getSubWallets(id: number): Promise<ISubWallet[]> {
    return DB.subWallets
      .where('[masterId+sortId]')
      .between([id, Dexie.minKey], [id, Dexie.maxKey])
      .toArray()
  }

  async getWallets(): Promise<IWallet[]> {
    return DB.wallets.toArray()
  }

  async deriveSubWallets(id: number, num: number) {
    const nextSortId = await getNextField(DB.subWallets, 'sortId', {
      key: 'masterId',
      value: id
    })
    const nextIndex = await getNextField(DB.subWallets, 'index', {
      key: 'masterId',
      value: id
    })
    const subWallets = [...Array(num).keys()].map((n) => {
      return {
        masterId: id,
        sortId: nextSortId + n,
        index: nextIndex + n,
        name: getDefaultSubName(nextIndex + n)
      } as ISubWallet
    })
    const ids = await DB.subWallets.bulkAdd(subWallets, { allKeys: true })
    assert(ids.length === subWallets.length)
    return subWallets.map((w, i) => {
      w.id = ids[i]
      return w
    })
  }

  async createChainAccountsAux(
    id: number,
    indices: number[],
    networkKind: NetworkKind,
    addresses: string[]
  ) {
    assert(indices.length === addresses.length)
    const accountsAux = indices.map((index, i) => {
      return {
        masterId: id,
        index,
        networkKind,
        address: addresses[i]
      } as IChainAccountAux
    })
    await DB.chainAccountsAux.bulkAdd(accountsAux)
  }

  private async _ensureChainAccount(
    wallet: IWallet,
    index: Index,
    networkKind: NetworkKind,
    chainId: ChainId
  ): Promise<IChainAccount | undefined> {
    // fast path
    const account = await getChainAccount(wallet, index, networkKind, chainId)
    if (account) {
      return account
    }
    // slow path
    return WALLET_SERVICE.ensureChainAccount(
      wallet,
      index,
      networkKind,
      chainId
    )
  }
}

class WalletService extends WalletServicePartial {
  async getKeystore(id: number): Promise<KeystoreAccount | undefined> {
    return KEYSTORE.get(id)
  }

  async newWallet({
    name,
    type,
    mnemonic,
    path,
    privateKey,
    networkKind,
    addresses
  }: NewWalletOpts): Promise<{
    wallet: IWallet
    decrypted?: _KeystoreAccount
  }> {
    name = name || (await generateDefaultWalletName(DB.wallets))

    let account, hash
    switch (type) {
      case WalletType.HD: {
        assert(mnemonic && !path && !privateKey)
        account = ethers.utils.HDNode.fromMnemonic(mnemonic)
        hash = account.address
        break
      }
      case WalletType.PRIVATE_KEY: {
        if (!privateKey) {
          assert(mnemonic && path)
          account = ethers.Wallet.fromMnemonic(mnemonic, path)
        } else {
          assert(!mnemonic && !path)
          account = new ethers.Wallet(privateKey)
        }
        hash = account.address
        break
      }
      case WalletType.WATCH: {
        assert(networkKind)
        assert(addresses && addresses.length === 1)
        hash = checkAddresses(networkKind, addresses)[0]
        break
      }
      case WalletType.WATCH_GROUP: {
        assert(networkKind)
        assert(addresses && addresses.length >= 1)
        hash = ethers.utils.getAddress(
          ethers.utils.hexDataSlice(ethers.utils.keccak256(name), 12)
        )
        break
      }
      default:
        throw new Error('unknown wallet type')
    }

    const wallet = {
      sortId: await getNextField(DB.wallets),
      type,
      name,
      path,
      hash, // use address or other unique string as hash
      createdAt: Date.now()
    } as IWallet

    const decrypted: _KeystoreAccount | undefined = account
      ? {
          address: account.address,
          privateKey: account.privateKey,
          mnemonic: account.mnemonic,
          _isKeystoreAccount: true
        }
      : undefined

    return {
      wallet,
      decrypted
    }
  }

  async createWallet(
    wallet: IWallet,
    decrypted?: _KeystoreAccount,
    networkKind?: NetworkKind,
    addresses?: string[]
  ) {
    await DB.transaction(
      'rw',
      [DB.wallets, DB.subWallets, DB.hdPaths, DB.chainAccountsAux],
      async () => {
        wallet.id = await DB.wallets.add(wallet)

        switch (wallet.type) {
          case WalletType.HD: {
            await this.createHdPaths(wallet.id)
            // derive one sub wallet
            await this.deriveSubWallets(wallet.id, 1)
            break
          }
          case WalletType.PRIVATE_KEY: {
            await DB.subWallets.add({
              masterId: wallet.id,
              sortId: 0,
              index: PSEUDO_INDEX,
              name: ''
            } as ISubWallet)
            break
          }
          case WalletType.WATCH: {
            assert(networkKind)
            assert(addresses && addresses.length === 1)
            await DB.subWallets.add({
              masterId: wallet.id,
              sortId: 0,
              index: PSEUDO_INDEX,
              name: ''
            } as ISubWallet)
            await this.createChainAccountsAux(
              wallet.id,
              [PSEUDO_INDEX],
              networkKind,
              addresses
            )
            break
          }
          case WalletType.WATCH_GROUP: {
            assert(networkKind)
            assert(addresses && addresses.length >= 1)
            const subWallets = await this.deriveSubWallets(
              wallet.id,
              addresses.length
            )
            await this.createChainAccountsAux(
              wallet.id,
              subWallets.map((w) => w.index),
              networkKind,
              addresses
            )
            break
          }
          default:
            throw new Error('unknown wallet type')
        }
      }
    )

    if (decrypted) {
      await KEYSTORE.set(wallet.id!, new KeystoreAccount(decrypted))
      // time-consuming, so do not wait for it
      KEYSTORE.persist(wallet)
    }
  }

  async updateWallet() {
    // TODO
  }

  async deleteWallet(id: number) {
    await DB.wallets.delete(id)
  }

  private _ensureLocks = new Map<number, Promise<unknown>>()

  private async _ensureLock(id: number): Promise<Function> {
    let promise = this._ensureLocks.get(id)
    if (promise) {
      await promise
    }

    let resolve: Function
    promise = new Promise((r) => {
      resolve = r
    })
    this._ensureLocks.set(id, promise)
    return () => {
      this._ensureLocks.delete(id)
      resolve()
    }
  }

  async ensureChainAccounts(
    wallet: IWallet | number,
    networkKind: NetworkKind,
    chainId: ChainId
  ) {
    const unlock = await this._ensureLock(
      typeof wallet === 'number' ? wallet : wallet.id
    )
    try {
      if (typeof wallet === 'number') {
        wallet = (await DB.wallets.get(wallet))!
      }
      // time-consuming
      await ensureChainAccounts(wallet, networkKind, chainId)
    } finally {
      unlock()
    }
  }

  async ensureChainAccount(
    wallet: IWallet,
    index: Index,
    networkKind: NetworkKind,
    chainId: ChainId
  ): Promise<IChainAccount | undefined> {
    const unlock = await this._ensureLock(wallet.id)
    try {
      return await ensureChainAccount(wallet, index, networkKind, chainId)
    } finally {
      unlock()
    }
  }

  private async createHdPaths(id: number) {
    for (const networkKind of Object.values(NetworkKind) as NetworkKind[]) {
      await DB.hdPaths.add({
        masterId: id,
        networkKind,
        path: getDefaultPathPrefix(networkKind)
      } as IHdPath)
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
      DB.subWallets
        .where('[masterId+sortId]')
        // .between([walletId, nextSortId], [walletId, Dexie.maxKey])
        .between([walletId, Dexie.minKey], [walletId, Dexie.maxKey])
        // .limit(limit)
        .toArray()
    )
  }, [walletId])
}

export function useSubWalletsCount() {
  return useLiveQuery(() => {
    return DB.subWallets.count()
  }, [])
}

export function useChainAccounts(
  id?: number,
  networkKind?: NetworkKind,
  chainId?: number | string
) {
  return useLiveQuery(async () => {
    if (
      id === undefined ||
      networkKind === undefined ||
      chainId === undefined
    ) {
      return undefined
    }

    await WALLET_SERVICE.ensureChainAccounts(id, networkKind, chainId)

    return DB.chainAccounts
      .where('[masterId+networkKind+chainId+index]')
      .between(
        [id, networkKind, chainId, Dexie.minKey],
        [id, networkKind, chainId, Dexie.maxKey]
      )
      .toArray()
  }, [id, networkKind, chainId])
}

export function useChainAccount(id?: number) {
  return useLiveQuery(async () => {
    if (id === undefined) {
      return undefined
    }
    return WALLET_SERVICE.getChainAccount(id)
  }, [id])
}

export function useChainAccountByIndex(
  masterId?: number,
  networkKind?: NetworkKind,
  chainId?: number | string,
  index?: Index
) {
  return useLiveQuery(async () => {
    if (
      masterId === undefined ||
      networkKind === undefined ||
      chainId === undefined ||
      index === undefined
    ) {
      return undefined
    }
    return WALLET_SERVICE.getChainAccount({
      masterId,
      networkKind,
      chainId,
      index
    })
  }, [masterId, networkKind, chainId, index])
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
    return WALLET_SERVICE.getSubWallet(id)
  }, [id])
}

export function useSubWalletByIndex(masterId?: number, index?: Index) {
  return useLiveQuery(() => {
    if (masterId === undefined || index === undefined) {
      return undefined
    }
    return WALLET_SERVICE.getSubWallet({ masterId, index })
  }, [masterId, index])
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

  await DB.transaction('rw', [DB.subWallets], async () => {
    const items = await DB.subWallets
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

      await DB.subWallets.update(items[i], { sortId })
    }
  })
}

async function ensureChainAccounts(
  wallet: IWallet,
  networkKind: NetworkKind,
  chainId: number | string
) {
  if (!isWalletGroup(wallet.type)) {
    await ensureChainAccount(wallet, PSEUDO_INDEX, networkKind, chainId)
    return
  }

  const masterId = wallet.id

  const subWalletsNum = await DB.subWallets
    .where('masterId')
    .equals(masterId)
    .count()
  if (!subWalletsNum) {
    return
  }

  let accountsAuxNum: number | undefined
  if (!hasWalletKeystore(wallet.type)) {
    accountsAuxNum = await DB.chainAccountsAux
      .where('[masterId+networkKind]')
      .equals([masterId, networkKind])
      .count()
    if (!accountsAuxNum) {
      return
    }
  }

  const chainAccountsNum = await DB.chainAccounts
    .where('[masterId+networkKind+chainId]')
    .equals([masterId, networkKind, chainId])
    .count()
  if (chainAccountsNum === subWalletsNum) {
    return
  }
  assert(chainAccountsNum < subWalletsNum)
  if (!hasWalletKeystore(wallet.type)) {
    assert(accountsAuxNum !== undefined)
    if (chainAccountsNum === accountsAuxNum) {
      return
    }
    assert(chainAccountsNum < accountsAuxNum)
  }

  let subWallets: ISubWallet[]
  let accountsAuxMap: Map<number, IChainAccountAux>
  if (hasWalletKeystore(wallet.type)) {
    subWallets = await DB.subWallets
      .where('masterId')
      .equals(masterId)
      .toArray()
  } else {
    const accountsAux = await DB.chainAccountsAux
      .where('[masterId+networkKind]')
      .equals([masterId, networkKind])
      .toArray()
    accountsAuxMap = new Map(accountsAux.map((aux) => [aux.index, aux]))
    subWallets = await DB.subWallets
      .where('[masterId+index]')
      .anyOf(accountsAux.map((aux) => [aux.masterId, aux.index]))
      .toArray()
    assert(subWallets.length === accountsAux.length)
  }

  const chainAccounts = await DB.chainAccounts
    .where('[masterId+networkKind+chainId]')
    .equals([masterId, networkKind, chainId])
    .toArray()

  let signingWallet: SigningWallet | undefined
  let hdPath: IHdPath | undefined
  if (wallet.type === WalletType.HD) {
    signingWallet = await getMasterSigningWallet(wallet, networkKind, chainId)

    hdPath = await DB.hdPaths.where({ masterId, networkKind }).first()
    assert(hdPath)
  }

  const existing = new Set()
  for (const info of chainAccounts) {
    existing.add(info.index)
  }
  const bulkAdd: IChainAccount[] = []

  const tick = Date.now()
  const queue = new PQueue({ concurrency: 4 })
  for (const subWallet of subWallets) {
    if (existing.has(subWallet.index)) {
      continue
    }
    queue.add(async () => {
      let address
      switch (wallet.type) {
        case WalletType.HD: {
          assert(signingWallet && hdPath)
          const subSigningWallet = await signingWallet.derive(
            hdPath.path,
            subWallet.index
          )
          address = subSigningWallet.address
          break
        }
        case WalletType.WATCH_GROUP: {
          assert(accountsAuxMap)
          const aux = accountsAuxMap.get(subWallet.index)
          assert(aux)
          address = aux.address
          break
        }
      }
      bulkAdd.push({
        masterId,
        index: subWallet.index,
        networkKind,
        chainId,
        address
      } as IChainAccount)
    })
  }
  await queue.onIdle()
  console.log(`derive chain accounts: ${(Date.now() - tick) / 1000}s`)

  await DB.chainAccounts.bulkAdd(bulkAdd)
  console.log(
    `ensured info for derived wallets: master wallet ${wallet.id}, network: ${networkKind}, chainID: ${chainId}`
  )
}

async function getChainAccount(
  wallet: IWallet,
  index: Index,
  networkKind: NetworkKind,
  chainId: number | string
): Promise<IChainAccount | undefined> {
  assert(
    index !== PSEUDO_INDEX
      ? wallet.type === WalletType.HD
      : wallet.type !== WalletType.HD
  )

  return DB.chainAccounts
    .where({
      masterId: wallet.id,
      index: index,
      networkKind,
      chainId
    })
    .first()
}

async function ensureChainAccount(
  wallet: IWallet,
  index: Index,
  networkKind: NetworkKind,
  chainId: number | string
): Promise<IChainAccount | undefined> {
  const existing = await getChainAccount(wallet, index, networkKind, chainId)
  if (existing) {
    return existing
  }

  let address
  switch (wallet.type) {
    case WalletType.HD: {
      const signingWallet = await getMasterSigningWallet(
        wallet,
        networkKind,
        chainId
      )
      const hdPath = await DB.hdPaths
        .where({ masterId: wallet.id, networkKind })
        .first()
      assert(hdPath)
      const subSigningWallet = await signingWallet.derive(hdPath.path, index)
      address = subSigningWallet.address
      break
    }
    case WalletType.PRIVATE_KEY: {
      const signingWallet = await getMasterSigningWallet(
        wallet,
        networkKind,
        chainId
      )
      address = signingWallet.address
      break
    }
    case WalletType.WATCH: {
      const aux = await DB.chainAccountsAux
        .where('[masterId+index+networkKind]')
        .equals([wallet.id, index, networkKind])
        .first()
      if (!aux) {
        return
      }
      address = aux.address
      break
    }
    case WalletType.WATCH_GROUP: {
      const aux = await DB.chainAccountsAux
        .where('[masterId+index+networkKind]')
        .equals([wallet.id, index, networkKind])
        .first()
      if (!aux) {
        return
      }
      address = aux.address
      break
    }
  }

  const account = {
    masterId: wallet.id,
    index,
    networkKind,
    chainId,
    address,
    info: {}
  } as IChainAccount
  account.id = await DB.chainAccounts.add(account)
  return account
}
