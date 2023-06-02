import Dexie from 'dexie'
import { Config, animals, uniqueNamesGenerator } from 'unique-names-generator'

import {
  IActiveBinding,
  IAddressBook,
  IAptosEvent,
  ICache,
  IChainAccount,
  IConnectedSite,
  IHdPath,
  IKeystore,
  INetwork,
  IPendingTx,
  ISubWallet,
  IToken,
  ITokenList,
  ITransaction,
  IWallet,
  activeBindingSchemaV1,
  addressBookSchemaV1,
  aptosEventSchemaV1,
  cacheSchemaV1,
  chainAccountSchemaV1,
  connectedSiteSchemaV1,
  hdPathSchemaV1,
  keystoreSchemaV1,
  networkSchemaV1,
  pendingTxSchemaV1,
  subWalletSchemaV1,
  tokenListSchemaV1,
  tokenSchemaV1,
  transactionSchemaV1,
  walletSchemaV1
} from '~lib/schema'

export class Database extends Dexie {
  wallets!: Dexie.Table<IWallet, number>
  keystores!: Dexie.Table<IKeystore, number>
  networks!: Dexie.Table<INetwork, number>
  hdPaths!: Dexie.Table<IHdPath, number>
  subWallets!: Dexie.Table<ISubWallet, number>
  chainAccounts!: Dexie.Table<IChainAccount, number>
  pendingTxs!: Dexie.Table<IPendingTx, number>
  transactions!: Dexie.Table<ITransaction, number>
  tokenLists!: Dexie.Table<ITokenList, number>
  tokens!: Dexie.Table<IToken, number>
  connectedSites!: Dexie.Table<IConnectedSite, number>
  activeBindings!: Dexie.Table<IActiveBinding, number>
  addressBook!: Dexie.Table<IAddressBook, number>
  cache!: Dexie.Table<ICache, number>
  aptosEvents!: Dexie.Table<IAptosEvent, number>

  constructor() {
    super('database')
    this.version(1).stores({
      wallets: walletSchemaV1,
      keystores: keystoreSchemaV1,
      networks: networkSchemaV1,
      hdPaths: hdPathSchemaV1,
      subWallets: subWalletSchemaV1,
      chainAccounts: chainAccountSchemaV1,
      pendingTxs: pendingTxSchemaV1,
      transactions: transactionSchemaV1,
      tokenLists: tokenListSchemaV1,
      tokens: tokenSchemaV1,
      connectedSites: connectedSiteSchemaV1,
      activeBindings: activeBindingSchemaV1,
      addressBook: addressBookSchemaV1,
      cache: cacheSchemaV1,
      aptosEvents: aptosEventSchemaV1
    })
  }
}

// Global db singleton
export const DB = new Database()

type StringLiteral<T> = T extends `${string & T}` ? T : never

export async function getNextField<
  K,
  T extends { [P in StringLiteral<K>]: number }
>(
  table: Dexie.Table<T>,
  key = 'sortId' as StringLiteral<K>,
  leading?: { key: string; value: string | number }
): Promise<number> {
  const collection = !leading
    ? table.orderBy(key)
    : table
        .where(`[${leading.key}+${key}]`)
        .between([leading.value, Dexie.minKey], [leading.value, Dexie.maxKey])
  const lastBySortId = await collection.reverse().first()
  return lastBySortId && lastBySortId[key] !== undefined
    ? lastBySortId[key] + 1
    : 0
}

export async function generateName<T>(
  table: Dexie.Table<T>,
  namePrefix = '',
  key = 'name'
): Promise<string> {
  const cfg: Config = {
    dictionaries: [animals]
  }
  let name
  for (let i = 0; i < 3; i++) {
    name = uniqueNamesGenerator(cfg)
    name = namePrefix + name[0].toUpperCase() + name.slice(1)

    if (!(await table.get({ [key]: name }))) {
      return name
    }
  }

  for (let num = 2; ; num++) {
    const nameNum = `${name} ${num}`
    if (!(await table.get({ [key]: nameNum }))) {
      return nameNum
    }
  }
}
