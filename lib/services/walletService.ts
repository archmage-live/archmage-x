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
  DerivePosition,
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
  checkAddressMayThrow,
  generatePath,
  getDefaultPath,
  getDerivePosition,
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

export type CreateWalletOpts = {
  wallet: IWallet
  decrypted?: _KeystoreAccount
  networkKind?: NetworkKind
  addresses?: string[]
  notBackedUp?: boolean
}

export interface WalletInfo {
  notBackedUp?: boolean
}

function checkAddresses(
  networkKind: NetworkKind,
  addresses: string[]
): string[] {
  return addresses.map((addr) => checkAddressMayThrow(networkKind, addr))
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

  createWallet(opts: CreateWalletOpts): Promise<void>

  backUpWallet(id: number): Promise<void>

  deleteWallet(id: number): Promise<void>

  deleteSubWallet(id: number): Promise<void>

  getWallet(id: number): Promise<IWallet | undefined>

  getSubWallet(id: number | SubIndex): Promise<ISubWallet | undefined>

  getChainAccount(
    id: number | ChainAccountIndex
  ): Promise<IChainAccount | undefined>

  getChainAccounts(
    query:
      | number[]
      | {
          networkKind: NetworkKind
          chainId: ChainId
          masterId?: number
          subIndices?: SubIndex[]
        }
  ): Promise<IChainAccount[]>

  getSubWallets(query?: number | SubIndex[]): Promise<ISubWallet[]>

  getWallets(query?: number[]): Promise<IWallet[]>

  deriveSubWallets(id: number, num: number): Promise<ISubWallet[]>

  ensureAllChainAccounts(
    networkKind: NetworkKind,
    chainId: ChainId
  ): Promise<void>

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

  getHdPath(
    masterId: number,
    networkKind: NetworkKind
  ): Promise<IHdPath | undefined>

  getHdPaths(masterId: number): Promise<IHdPath[]>

  updateHdPath(
    masterId: number,
    networkKind: NetworkKind,
    path: string,
    derivePosition?: DerivePosition
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
      if (!wallet) {
        return undefined
      }
      return this._ensureChainAccount(
        wallet,
        id.index,
        id.networkKind,
        id.chainId
      )
    }
  }

  async getChainAccounts(
    query:
      | number[]
      | {
          networkKind: NetworkKind
          chainId: ChainId
          masterId?: number
          subIndices?: SubIndex[]
        }
  ): Promise<IChainAccount[]> {
    if (Array.isArray(query)) {
      if (!query.length) {
        return []
      }
      const accounts = await DB.chainAccounts
        .where('id')
        .anyOf(query as number[])
        .toArray()

      assert(accounts.length === query.length)
      return accounts
    } else {
      const { networkKind, chainId, masterId, subIndices } = query

      if (subIndices) {
        if (!subIndices.length) {
          return []
        }

        for (const { masterId } of subIndices) {
          await WALLET_SERVICE.ensureChainAccounts(
            masterId,
            networkKind,
            chainId
          )
        }

        const anyOf = subIndices.map(({ masterId, index }) => [
          query.networkKind,
          query.chainId,
          masterId,
          index
        ])
        const accounts = await DB.chainAccounts
          .where('[networkKind+chainId+masterId+index]')
          .anyOf(anyOf)
          .toArray()
        assert(accounts.length === subIndices.length)
        return accounts
      } else if (typeof masterId === 'number') {
        await WALLET_SERVICE.ensureChainAccounts(masterId, networkKind, chainId)

        return DB.chainAccounts
          .where('[masterId+networkKind+chainId+index]')
          .between(
            [masterId, networkKind, chainId, Dexie.minKey],
            [masterId, networkKind, chainId, Dexie.maxKey]
          )
          .toArray()
      } else {
        await WALLET_SERVICE.ensureAllChainAccounts(networkKind, chainId)

        return DB.chainAccounts
          .where('[networkKind+chainId+masterId+index]')
          .between(
            [networkKind, chainId, Dexie.minKey, Dexie.minKey],
            [networkKind, chainId, Dexie.maxKey, Dexie.maxKey]
          )
          .toArray()
      }
    }
  }

  async getSubWallets(query?: number | SubIndex[]): Promise<ISubWallet[]> {
    if (typeof query === 'number') {
      const id = query
      return DB.subWallets
        .where('[masterId+sortId]')
        .between([id, Dexie.minKey], [id, Dexie.maxKey])
        .toArray()
    } else if (Array.isArray(query)) {
      return DB.subWallets
        .where('[masterId+index]')
        .anyOf(query.map(({ masterId, index }) => [masterId, index]))
        .sortBy('sortId')
    } else {
      return DB.subWallets.orderBy('[masterId+sortId]').toArray()
    }
  }

  async getWallets(query?: number[]): Promise<IWallet[]> {
    if (Array.isArray(query)) {
      return DB.wallets.where('id').anyOf(query).sortBy('sortId')
    } else {
      return DB.wallets.orderBy('sortId').toArray()
    }
  }

  async deriveSubWallets(id: number, num: number) {
    const wallet = await this.getWallet(id)
    assert(wallet && isWalletGroup(wallet.type))

    const nextSortId = await getNextField(DB.subWallets, 'sortId', {
      key: 'masterId',
      value: id
    })
    const nextIndex = await getNextField(DB.subWallets, 'index', {
      key: 'masterId',
      value: id
    })
    const subWallets = [...Array(num).keys()].map((n) => {
      // TODO: check name conflict
      const name = getDefaultSubName(nextIndex + n)

      return {
        masterId: id,
        sortId: nextSortId + n,
        index: nextIndex + n,
        name
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
    return Promise.resolve(
      WALLET_SERVICE.ensureChainAccount(wallet, index, networkKind, chainId)
    )
  }

  async getHdPath(
    masterId: number,
    networkKind: NetworkKind
  ): Promise<IHdPath | undefined> {
    const hdPath = await DB.hdPaths.where({ masterId, networkKind }).first()
    if (hdPath) {
      return hdPath
    }
    return (WALLET_SERVICE as any)._getHdPath(masterId, networkKind, true)
  }

  async getHdPaths(masterId: number) {
    let hdPaths = await DB.hdPaths.where('masterId').equals(masterId).toArray()
    const networkKinds = Object.values(NetworkKind) as NetworkKind[]
    if (hdPaths.length < networkKinds.length) {
      for (const networkKind of networkKinds) {
        if (hdPaths.find((hdPath) => hdPath.networkKind === networkKind)) {
          continue
        }
        await this.getHdPath(masterId, networkKind)
      }
      hdPaths = await DB.hdPaths.where('masterId').equals(masterId).toArray()
    }
    return hdPaths
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
        checkAddresses(networkKind, addresses)
        hash = ethers.utils.getAddress(
          ethers.utils.hexDataSlice(
            ethers.utils.keccak256(ethers.utils.randomBytes(32)),
            12
          )
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

  async createWallet({
    wallet,
    decrypted,
    networkKind,
    addresses,
    notBackedUp
  }: CreateWalletOpts) {
    await DB.transaction(
      'rw',
      [DB.wallets, DB.subWallets, DB.hdPaths, DB.chainAccountsAux],
      async () => {
        if (notBackedUp) {
          assert(wallet.type === WalletType.HD)
          wallet.info = { notBackedUp } as WalletInfo
        }

        wallet.id = await DB.wallets.add(wallet)

        switch (wallet.type) {
          case WalletType.HD: {
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
            addresses = checkAddresses(networkKind, addresses)
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
            addresses = checkAddresses(networkKind, addresses)
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
      await KEYSTORE.set(wallet.id, new KeystoreAccount(decrypted))
      // time-consuming, so do not wait for it
      KEYSTORE.persist(wallet)
    }
  }

  async backUpWallet(id: number) {
    const wallet = await this.getWallet(id)
    if (!wallet) {
      return
    }
    const info = wallet.info as WalletInfo
    if (!info) {
      return
    }
    delete info.notBackedUp
    await DB.wallets.update(wallet.id, { info })
  }

  async deleteWallet(id: number) {
    const wallet = await DB.wallets.get(id)
    if (!wallet) {
      return
    }

    const unlock = await this._ensureLock(id)

    try {
      await DB.transaction(
        'rw',
        [
          DB.wallets,
          DB.keystores,
          DB.hdPaths,
          DB.subWallets,
          DB.chainAccounts,
          DB.chainAccountsAux,
          DB.connectedSites,
          DB.tokens,
          DB.transactions,
          DB.pendingTxs
        ],
        async () => {
          await this._deleteWalletResources(id)
          await DB.hdPaths.where('masterId').equals(id).delete()
          await DB.subWallets.where('masterId').equals(id).delete()
          await DB.chainAccountsAux.where('masterId').equals(id).delete()
          await DB.connectedSites.where('masterId').equals(id).delete()

          await DB.wallets.delete(id)
          await DB.keystores.where('masterId').equals(id).delete()

          await Dexie.waitFor(KEYSTORE.remove(id))
        }
      )
    } finally {
      unlock()
    }
  }

  private async _deleteWalletResources(id: number) {
    await DB.chainAccounts.where('masterId').equals(id).delete()
    await DB.tokens.where('masterId').equals(id).delete()
    await DB.transactions.where('masterId').equals(id).delete()
    await DB.pendingTxs.where('masterId').equals(id).delete()
  }

  async deleteSubWallet(id: number) {
    const subWallet = await DB.subWallets.get(id)
    if (!subWallet) {
      return
    }

    const unlock = await this._ensureLock(subWallet.masterId)

    try {
      await DB.transaction(
        'rw',
        [
          DB.subWallets,
          DB.chainAccounts,
          DB.chainAccountsAux,
          DB.connectedSites,
          DB.tokens,
          DB.transactions,
          DB.pendingTxs
        ],
        async () => {
          await DB.chainAccounts
            .where('[masterId+index]')
            .equals([subWallet.masterId, subWallet.index])
            .delete()
          await DB.chainAccountsAux
            .where('[masterId+index]')
            .equals([subWallet.masterId, subWallet.index])
            .delete()
          await DB.connectedSites
            .where('[masterId+index]')
            .equals([subWallet.masterId, subWallet.index])
            .delete()
          await DB.tokens
            .where('[masterId+index]')
            .equals([subWallet.masterId, subWallet.index])
            .delete()
          await DB.transactions
            .where('[masterId+index]')
            .equals([subWallet.masterId, subWallet.index])
            .delete()
          await DB.pendingTxs
            .where('[masterId+index]')
            .equals([subWallet.masterId, subWallet.index])
            .delete()

          await DB.subWallets.delete(id)
        }
      )
    } finally {
      unlock()
    }
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

  async ensureAllChainAccounts(networkKind: NetworkKind, chainId: ChainId) {
    const wallets = await this.getWallets()
    for (const wallet of wallets) {
      await this.ensureChainAccounts(wallet, networkKind, chainId)
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
      try {
        await ensureChainAccounts(wallet, networkKind, chainId)
      } catch (e) {
        console.error(e)
      }
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

  async _getHdPath(
    masterId: number,
    networkKind: NetworkKind,
    useLock: boolean
  ) {
    let hdPath = await DB.hdPaths.where({ masterId, networkKind }).first()

    if (!hdPath) {
      const wallet = await this.getWallet(masterId)
      if (!wallet) {
        return
      }
      assert(wallet.type === WalletType.HD)
      const unlock = useLock && (await this._ensureLock(masterId))
      try {
        hdPath = await DB.hdPaths.where({ masterId, networkKind }).first()
        if (hdPath) {
          unlock && unlock()
          return hdPath
        }

        await DB.hdPaths.add({
          masterId,
          networkKind,
          path: getDefaultPath(networkKind)
        } as IHdPath)
      } finally {
        unlock && unlock()
      }

      hdPath = await DB.hdPaths.where({ masterId, networkKind }).first()
    }

    return hdPath
  }

  async updateHdPath(
    masterId: number,
    networkKind: NetworkKind,
    path: string,
    derivePosition?: DerivePosition
  ) {
    const hdPath = await this.getHdPath(masterId, networkKind)
    if (
      !hdPath ||
      (hdPath.path === path &&
        (!derivePosition || hdPath.info?.derivePosition === derivePosition))
    ) {
      return
    }

    const unlock = await this._ensureLock(masterId)
    try {
      await DB.transaction(
        'rw',
        [
          DB.hdPaths,
          DB.chainAccounts,
          DB.tokens,
          DB.transactions,
          DB.pendingTxs
        ],
        async () => {
          let info = hdPath.info
          if (derivePosition) {
            if (!info) {
              info = {}
            }
            info.derivePosition = derivePosition
          }
          await DB.hdPaths.update(hdPath, { path, info })
          // Delete all related accounts, and later they will be generated with new hd path
          await this._deleteWalletResources(masterId)
        }
      )
    } finally {
      unlock()
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
    return WALLET_SERVICE.getWallets()
  })
}

export function useSubWallets(walletId: number) {
  return useLiveQuery(() => {
    return DB.subWallets
      .where('[masterId+sortId]')
      .between([walletId, Dexie.minKey], [walletId, Dexie.maxKey])
      .toArray()
  }, [walletId])
}

export function useSubWalletsCount(walletId?: number) {
  return useLiveQuery(() => {
    if (walletId === undefined) {
      return DB.subWallets.count()
    } else {
      return DB.subWallets.where('masterId').equals(walletId).count()
    }
  }, [walletId])
}

export function useChainAccountsByWallet(
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
    return WALLET_SERVICE.getChainAccounts({
      masterId: id,
      networkKind,
      chainId
    })
  }, [id, networkKind, chainId])
}

export function useChainAccounts(
  query?:
    | number[]
    | {
        networkKind: NetworkKind
        chainId: ChainId
        masterId?: number
        subIndices?: SubIndex[]
      }
) {
  return useLiveQuery(async () => {
    if (query === undefined) {
      return
    }
    return WALLET_SERVICE.getChainAccounts(query)
  }, [query])
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
    return WALLET_SERVICE.getWallet(id)
  }, [id])
}

export function useSubWallet(id?: number) {
  return useLiveQuery(async () => {
    if (id === undefined) {
      return undefined
    }
    return await WALLET_SERVICE.getSubWallet(id)
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

export function useHdPath(
  networkKind?: NetworkKind,
  wallet?: IWallet,
  index?: number
): [string | undefined, DerivePosition | undefined] {
  return (
    useLiveQuery(async () => {
      if (!networkKind || !wallet || typeof index !== 'number') {
        return
      }
      const hdPath = await WALLET_SERVICE.getHdPath(wallet.id, networkKind)
      if (!hdPath) {
        return
      }
      const position = getDerivePosition(hdPath, networkKind)
      return [generatePath(hdPath.path, index, position), position]
    }, [networkKind, wallet, index]) || [undefined, undefined]
  )
}

export function useHdPaths(
  walletId?: number
): Map<NetworkKind, string> | undefined {
  return useLiveQuery(async () => {
    if (walletId === undefined) {
      return undefined
    }
    const m = new Map<NetworkKind, string>()
    const hdPaths = await WALLET_SERVICE.getHdPaths(walletId)
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

  const chainAccountsNum = await DB.chainAccounts
    .where('[masterId+networkKind+chainId]')
    .equals([masterId, networkKind, chainId])
    .count()
  if (chainAccountsNum === subWalletsNum) {
    return
  }
  assert(chainAccountsNum < subWalletsNum)

  const subWallets = await DB.subWallets
    .where('masterId')
    .equals(masterId)
    .toArray()

  let accountsAuxMap: Map<number, IChainAccountAux>
  if (!hasWalletKeystore(wallet.type)) {
    const accountsAux = await DB.chainAccountsAux
      .where('[masterId+networkKind]')
      .equals([masterId, networkKind])
      .toArray()
    accountsAuxMap = new Map(accountsAux.map((aux) => [aux.index, aux]))
  }

  const chainAccounts = await DB.chainAccounts
    .where('[masterId+networkKind+chainId]')
    .equals([masterId, networkKind, chainId])
    .toArray()

  let signingWallet: SigningWallet | undefined
  let hdPath: IHdPath | undefined
  if (wallet.type === WalletType.HD) {
    signingWallet = await getMasterSigningWallet(wallet, networkKind, chainId)
    if (!signingWallet) {
      return
    }

    hdPath = await (WALLET_SERVICE as any)._getHdPath(
      masterId,
      networkKind,
      false
    )
    if (!hdPath) {
      return
    }
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
            subWallet.index,
            getDerivePosition(hdPath, networkKind)
          )
          address = subSigningWallet.address
          break
        }
        case WalletType.WATCH_GROUP: {
          assert(accountsAuxMap)
          const aux = accountsAuxMap.get(subWallet.index)
          address = aux?.address
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

  await DB.transaction('rw', [DB.subWallets, DB.chainAccounts], async () => {
    // check sub wallet existence, to avoid issue of deletion before add
    const subWalletsNum = await DB.subWallets
      .where('[masterId+index]')
      .anyOf(bulkAdd.map((account) => [account.masterId, account.index]))
      .count()
    if (bulkAdd.length !== subWalletsNum) {
      return
    }

    await DB.chainAccounts.bulkAdd(bulkAdd)
  })
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
      ? isWalletGroup(wallet.type)
      : !isWalletGroup(wallet.type)
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
      if (!signingWallet) {
        return
      }
      const hdPath = await (WALLET_SERVICE as any)._getHdPath(
        wallet.id,
        networkKind,
        false
      )
      if (!hdPath) {
        return
      }
      const subSigningWallet = await signingWallet.derive(
        hdPath.path,
        index,
        getDerivePosition(hdPath, networkKind)
      )
      address = subSigningWallet.address
      break
    }
    case WalletType.PRIVATE_KEY: {
      const signingWallet = await getMasterSigningWallet(
        wallet,
        networkKind,
        chainId
      )
      if (!signingWallet) {
        return
      }
      address = signingWallet.address
      break
    }
    case WalletType.WATCH: {
      const aux = await DB.chainAccountsAux
        .where('[masterId+index+networkKind]')
        .equals([wallet.id, index, networkKind])
        .first()
      address = aux?.address
      break
    }
    case WalletType.WATCH_GROUP: {
      const aux = await DB.chainAccountsAux
        .where('[masterId+index+networkKind]')
        .equals([wallet.id, index, networkKind])
        .first()
      address = aux?.address
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

  return DB.transaction('rw', [DB.subWallets, DB.chainAccounts], async () => {
    // check sub wallet existence, to avoid issue of deletion before add
    if (!(await WALLET_SERVICE.getSubWallet({ masterId: wallet.id, index }))) {
      return
    }

    account.id = await DB.chainAccounts.add(account)
    return account
  })
}
