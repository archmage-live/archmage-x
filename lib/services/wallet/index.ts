import { entropyToMnemonic } from '@ethersproject/hdnode'
import { KeystoreAccount } from '@ethersproject/json-wallets/lib.esm/keystore'
import { randomBytes } from '@ethersproject/random'
import assert from 'assert'
import Dexie from 'dexie'
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
  IHdPath,
  Index,
  PSEUDO_INDEX,
  SubIndex,
  formatAddressForNetwork,
  generateDefaultWalletName,
  getAddressFromInfo
} from '~lib/schema'
import { IChainAccount } from '~lib/schema/chainAccount'
import { ISubWallet, getDefaultSubName } from '~lib/schema/subWallet'
import { IWallet } from '~lib/schema/wallet'
import { NETWORK_SERVICE } from '~lib/services/network'
import {
  BtcAddressType,
  DecryptedKeystoreAccount,
  HardwareWalletType,
  KeystoreSigningWallet,
  WalletAccount,
  WalletType,
  buildWalletUniqueHash,
  checkAddressMayThrow,
  getDefaultPath,
  getDerivePosition,
  getStructuralSigningWallet,
  isWalletGroup
} from '~lib/wallet'

export * from './hooks'

export type NewWalletOpts = {
  name?: string
  type: WalletType
  mnemonic?: string
  hwType?: HardwareWalletType
  path?: string // for WalletType.PRIVATE_KEY (by mnemonic) / WalletType.HW
  pathTemplate?: string // for WalletType.HW / WalletType.HW_GROUP
  derivePosition?: DerivePosition // for WalletType.HW / WalletType.HW_GROUP
  networkKind?: NetworkKind
  hash?: string // for WalletType.HW_GROUP
  accounts?: WalletAccount[] // for imported wallets
  addressType?: BtcAddressType
}

export type CreateWalletOpts = {
  wallet: IWallet
  decryptedKeystores?: DecryptedKeystoreAccount[]
  networkKind?: NetworkKind
  accounts?: WalletAccount[] // for imported wallets
  notBackedUp?: boolean
}

export type AddSubWalletsOpts = {
  wallet: IWallet
  networkKind?: NetworkKind
  accounts?: WalletAccount[] // for WalletType.HW_GROUP
}

export interface WalletInfo {
  path?: string
  notBackedUp?: boolean
}

function checkAccounts(accounts: WalletAccount[], networkKind?: NetworkKind) {
  return accounts.map((account) => {
    assert(
      [
        account.address,
        account.mnemonic && account.path,
        account.privateKey
      ].filter(Boolean).length === 1
    )

    if (account.address) {
      assert(networkKind)
      return {
        ...account,
        address: formatAddressForNetwork(
          checkAddressMayThrow(networkKind, account.address),
          networkKind
        )
      } as WalletAccount
    } else {
      return account
    }
  })
}

export interface IWalletService {
  getKeystore(id: number, index?: Index): Promise<KeystoreAccount | undefined>

  generateMnemonic(opts?: { locale?: string }): Promise<string>

  newWallet(opts: NewWalletOpts): Promise<{
    wallet: IWallet
    decryptedKeystores?: DecryptedKeystoreAccount[]
  }>

  existsName(name: string): Promise<boolean>

  existsSecret(wallet: IWallet): Promise<boolean>

  createWallet(opts: CreateWalletOpts): Promise<void>

  addSubWallets(opts: AddSubWalletsOpts): Promise<void>

  backUpWallet(id: number): Promise<void>

  deleteWallet(id: number): Promise<void>

  deleteSubWallet(id: number | SubIndex): Promise<void>

  getWallet(id?: number, hash?: string): Promise<IWallet | undefined>

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

  deriveSubWallets(
    id: number,
    num: number,
    accounts?: WalletAccount[],
    networkKind?: NetworkKind
  ): Promise<ISubWallet[]>

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

  updateChainAccount(account: IChainAccount): Promise<void>

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

  async getWallet(id?: number, hash?: string): Promise<IWallet | undefined> {
    if (typeof id === 'number') {
      return DB.wallets.get(id)
    }
    if (hash) {
      return DB.wallets.where('hash').equals(hash).first()
    }
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

  async deriveSubWallets(
    id: number,
    num: number,
    accounts?: WalletAccount[],
    networkKind?: NetworkKind
  ) {
    assert(!accounts || accounts.length === num)

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
      const acc = accounts?.[n]
      const index = !acc ? nextIndex + n : acc.index

      if (networkKind && acc?.address) {
        assert(
          formatAddressForNetwork(acc.address, networkKind) === acc.address
        )
      }

      // there should be no conflict when using default sub name for specific index
      const name = getDefaultSubName(index)

      return {
        masterId: id,
        sortId: nextSortId + n,
        index,
        name,
        hash: acc?.hash,
        info: {
          networkKind,
          address: acc?.address,
          publicKey: acc?.publicKey
        }
      } as ISubWallet
    })
    const ids = await DB.subWallets.bulkAdd(subWallets, { allKeys: true })
    assert(ids.length === subWallets.length)
    return subWallets.map((w, i) => {
      w.id = ids[i]
      return w
    })
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
  async getKeystore(
    id: number,
    index?: Index
  ): Promise<KeystoreAccount | undefined> {
    return KEYSTORE.get(id, index)
  }

  async newWallet({
    name,
    type,
    mnemonic,
    hwType,
    path,
    pathTemplate,
    derivePosition,
    networkKind,
    hash,
    accounts,
    addressType
  }: NewWalletOpts): Promise<{
    wallet: IWallet
    decryptedKeystores?: DecryptedKeystoreAccount[]
  }> {
    name = name || (await generateDefaultWalletName(DB.wallets))

    let decryptedKeystores: DecryptedKeystoreAccount[] = []
    switch (type) {
      case WalletType.HD: {
        assert(mnemonic && !path)
        assert(addressType)
        const acc = ethers.utils.HDNode.fromMnemonic(mnemonic)
        decryptedKeystores.push({
          index: PSEUDO_INDEX,
          account: {
            address: acc.address,
            privateKey: acc.privateKey,
            mnemonic: acc.mnemonic,
            _isKeystoreAccount: true
          }
        })
        break
      }
      case WalletType.PRIVATE_KEY:
      // pass through
      case WalletType.PRIVATE_KEY_GROUP:
        assert(addressType)
        assert(
          accounts &&
            accounts.length >= 1 &&
            (type !== WalletType.PRIVATE_KEY || accounts.length === 1)
        )
        accounts = checkAccounts(accounts)
        for (const { index, mnemonic, path, privateKey } of accounts) {
          let acc
          if (!privateKey) {
            assert(mnemonic && path)
            acc = ethers.Wallet.fromMnemonic(mnemonic, path)
          } else {
            assert(!mnemonic && !path)
            acc = new ethers.Wallet(privateKey)
          }
          decryptedKeystores.push({
            index,
            account: {
              address: acc.address,
              privateKey: acc.privateKey,
              mnemonic: acc.mnemonic,
              _isKeystoreAccount: true
            }
          })
        }
        break
      case WalletType.WATCH:
      // pass through
      case WalletType.WALLET_CONNECT: {
        assert(networkKind)
        assert(networkKind !== NetworkKind.BTC || addressType)
        assert(accounts && accounts.length === 1)
        accounts = checkAccounts(accounts, networkKind)
        break
      }
      case WalletType.WATCH_GROUP:
      // pass through
      case WalletType.WALLET_CONNECT_GROUP: {
        assert(networkKind)
        assert(networkKind !== NetworkKind.BTC || addressType)
        assert(accounts && accounts.length >= 1)
        accounts = checkAccounts(accounts, networkKind)
        break
      }
      case WalletType.HW: {
        assert(hwType && path && pathTemplate && derivePosition)
        assert(networkKind)
        assert(networkKind !== NetworkKind.BTC || addressType)
        assert(accounts && accounts.length === 1)
        accounts = checkAccounts(accounts, networkKind)
        break
      }
      case WalletType.HW_GROUP: {
        assert(hwType && pathTemplate && derivePosition)
        assert(networkKind)
        assert(networkKind !== NetworkKind.BTC || addressType)
        assert(accounts && accounts.length >= 1)
        accounts = checkAccounts(accounts, networkKind)
        assert(
          new Set(accounts.map(({ index }) => index)).size === accounts.length
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
      info: {
        hwType,
        path,
        pathTemplate,
        derivePosition,
        addressType
      },
      createdAt: Date.now()
    } as IWallet

    wallet.hash = buildWalletUniqueHash(
      wallet,
      decryptedKeystores,
      accounts,
      hash
    )

    return {
      wallet,
      decryptedKeystores
    }
  }

  async createWallet({
    wallet,
    decryptedKeystores,
    networkKind,
    accounts,
    notBackedUp
  }: CreateWalletOpts) {
    await DB.transaction(
      'rw',
      [DB.wallets, DB.subWallets, DB.hdPaths],
      async () => {
        if (notBackedUp) {
          assert(wallet.type === WalletType.HD)
          wallet.info.notBackedUp = notBackedUp
        }

        wallet.id = await DB.wallets.add(wallet)

        switch (wallet.type) {
          case WalletType.HD: {
            // derive one sub wallet
            await this.deriveSubWallets(wallet.id, 1)
            break
          }
          case WalletType.PRIVATE_KEY: {
            assert(
              accounts &&
                accounts.length === 1 &&
                accounts[0].index === PSEUDO_INDEX
            )
            accounts = checkAccounts(accounts)
            const { hash } = accounts[0]

            await DB.subWallets.add({
              masterId: wallet.id,
              sortId: 0,
              index: PSEUDO_INDEX,
              name: '',
              hash,
              info: {}
            } as ISubWallet)
            break
          }
          case WalletType.PRIVATE_KEY_GROUP: {
            assert(accounts && accounts.length >= 1)
            accounts = checkAccounts(accounts)
            assert(accounts.every(({ index }, i) => index === i))

            await this.deriveSubWallets(wallet.id, accounts.length, accounts)
            break
          }
          case WalletType.WATCH:
          // pass through
          case WalletType.WALLET_CONNECT: {
            assert(networkKind)
            assert(
              accounts &&
                accounts.length === 1 &&
                accounts[0].index === PSEUDO_INDEX
            )
            accounts = checkAccounts(accounts, networkKind)
            const { hash, address, publicKey } = accounts[0]
            await DB.subWallets.add({
              masterId: wallet.id,
              sortId: 0,
              index: PSEUDO_INDEX,
              name: '',
              hash,
              info: {
                networkKind,
                address,
                publicKey
              }
            } as ISubWallet)
            break
          }
          case WalletType.WATCH_GROUP:
          // pass through
          case WalletType.WALLET_CONNECT_GROUP: {
            assert(networkKind)
            assert(accounts && accounts.length >= 1)
            accounts = checkAccounts(accounts, networkKind)
            assert(accounts.every(({ index }, i) => index === i))

            await this.deriveSubWallets(
              wallet.id,
              accounts.length,
              accounts,
              networkKind
            )
            break
          }
          case WalletType.HW: {
            assert(networkKind)
            assert(
              accounts &&
                accounts.length === 1 &&
                accounts[0].index === PSEUDO_INDEX
            )
            accounts = checkAccounts(accounts, networkKind)
            const { hash, address, publicKey } = accounts[0]

            await DB.subWallets.add({
              masterId: wallet.id,
              sortId: 0,
              index: PSEUDO_INDEX,
              name: '',
              hash,
              info: {
                networkKind,
                address,
                publicKey
              }
            } as ISubWallet)
            break
          }
          case WalletType.HW_GROUP: {
            assert(networkKind)
            assert(accounts && accounts.length >= 1)
            accounts = checkAccounts(accounts, networkKind)
            const indices = accounts.map(({ index }) => index)
            assert(new Set(indices).size === accounts.length)

            await this.deriveSubWallets(
              wallet.id,
              accounts.length,
              accounts,
              networkKind
            )
            break
          }
          default:
            throw new Error('unknown wallet type')
        }
      }
    )

    if (decryptedKeystores) {
      for (const { index, account } of decryptedKeystores) {
        await KEYSTORE.set(wallet.id, index, new KeystoreAccount(account))
        KEYSTORE.persist(wallet, index).then(() => {
          // time-consuming, so do not wait for it
        })
      }
    }
  }

  async addSubWallets({
    wallet,
    networkKind,
    accounts
  }: AddSubWalletsOpts): Promise<void> {
    await DB.transaction(
      'rw',
      [DB.wallets, DB.subWallets, DB.hdPaths],
      async () => {
        switch (wallet.type) {
          case WalletType.PRIVATE_KEY_GROUP:
          // pass through
          case WalletType.MPC_GROUP:
            break

          case WalletType.WATCH_GROUP:
          // pass through
          case WalletType.HW_GROUP:
          // pass through
          case WalletType.WALLET_CONNECT_GROUP:
          // pass through
          case WalletType.MULTI_SIG_GROUP:
            assert(networkKind)
            break
        }

        assert(accounts && accounts.length >= 1)
        accounts = checkAccounts(accounts, networkKind)
        const indices = accounts.map(({ index }) => index)
        assert(new Set(indices).size === accounts.length)
        await this.deriveSubWallets(
          wallet.id,
          accounts.length,
          accounts,
          networkKind
        )
      }
    )

    switch (wallet.type) {
      case WalletType.PRIVATE_KEY_GROUP:
        const decryptedKeystores: DecryptedKeystoreAccount[] = []
        for (const { index, mnemonic, path, privateKey } of accounts!) {
          let acc
          if (!privateKey) {
            assert(mnemonic && path)
            acc = ethers.Wallet.fromMnemonic(mnemonic, path)
          } else {
            assert(!mnemonic && !path)
            acc = new ethers.Wallet(privateKey)
          }
          decryptedKeystores.push({
            index,
            account: {
              address: acc.address,
              privateKey: acc.privateKey,
              mnemonic: acc.mnemonic,
              _isKeystoreAccount: true
            }
          })
        }

        if (decryptedKeystores) {
          for (const { index, account } of decryptedKeystores) {
            await KEYSTORE.set(wallet.id, index, new KeystoreAccount(account))
            KEYSTORE.persist(wallet, index).then(() => {
              // time-consuming, so do not wait for it
            })
          }
        }
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
          DB.connectedSites,
          DB.tokens,
          DB.transactions,
          DB.pendingTxs
        ],
        async () => {
          await this._deleteWalletResources(id)
          await DB.hdPaths.where('masterId').equals(id).delete()
          await DB.subWallets.where('masterId').equals(id).delete()
          await DB.connectedSites.where('masterId').equals(id).delete()

          await DB.wallets.delete(id)
          await DB.keystores.where('masterId').equals(id).delete()

          await Dexie.waitFor(KEYSTORE.removeAll(id))
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

  async deleteSubWallet(id: number | SubIndex) {
    const subWallet = await this.getSubWallet(id)
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

          await DB.subWallets.delete(subWallet.id)
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

  async updateChainAccount(account: IChainAccount): Promise<void> {
    await DB.chainAccounts.put(account)
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

async function ensureChainAccounts(
  wallet: IWallet,
  networkKind: NetworkKind,
  chainId: ChainId
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

  const chainAccounts = await DB.chainAccounts
    .where('[masterId+networkKind+chainId]')
    .equals([masterId, networkKind, chainId])
    .toArray()

  let signingWallet: KeystoreSigningWallet | undefined
  let hdPath: IHdPath | undefined
  if (wallet.type === WalletType.HD) {
    signingWallet = await getStructuralSigningWallet(
      wallet,
      networkKind,
      chainId
    )
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
  for (const acc of chainAccounts) {
    existing.add(acc.index)
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
        case WalletType.PRIVATE_KEY_GROUP: {
          const signingWallet = await getStructuralSigningWallet(
            wallet,
            networkKind,
            chainId,
            subWallet.index
          )
          address = signingWallet?.address
          break
        }
        case WalletType.WATCH_GROUP:
        // pass through
        case WalletType.WALLET_CONNECT_GROUP:
        // pass through
        case WalletType.HW_GROUP: {
          const network = await NETWORK_SERVICE.getNetwork({
            kind: networkKind,
            chainId
          })
          if (network) {
            address = getAddressFromInfo(subWallet, network)
          }
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
      const signingWallet = await getStructuralSigningWallet(
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
      const signingWallet = await getStructuralSigningWallet(
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
    case WalletType.PRIVATE_KEY_GROUP: {
      const subWallet = await WALLET_SERVICE.getSubWallet({
        masterId: wallet.id,
        index
      })
      if (!subWallet) {
        return
      }
      const signingWallet = await getStructuralSigningWallet(
        wallet,
        networkKind,
        chainId,
        subWallet.index
      )
      if (!signingWallet) {
        return
      }
      address = signingWallet?.address
      break
    }
    case WalletType.WATCH:
    // pass through
    case WalletType.WALLET_CONNECT:
    // pass through
    case WalletType.HW: {
      const subWallet = await WALLET_SERVICE.getSubWallet({
        masterId: wallet.id,
        index
      })
      const network = await NETWORK_SERVICE.getNetwork({
        kind: networkKind,
        chainId
      })
      if (subWallet && network) {
        address = getAddressFromInfo(subWallet, network)
      }
      break
    }
    case WalletType.WATCH_GROUP:
    // pass through
    case WalletType.WALLET_CONNECT_GROUP:
    // pass through
    case WalletType.HW_GROUP: {
      const subWallet = await WALLET_SERVICE.getSubWallet({
        masterId: wallet.id,
        index
      })
      const network = await NETWORK_SERVICE.getNetwork({
        kind: networkKind,
        chainId
      })
      if (subWallet && network) {
        address = getAddressFromInfo(subWallet, network)
      }
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
