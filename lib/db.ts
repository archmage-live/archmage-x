import Dexie from 'dexie'
import {
  Config,
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator
} from 'unique-names-generator'

import { IChainAccount, chainAccountSchemaV1 } from '~lib/schema/chainAccount'
import {
  IConnectedSite,
  connectedSiteSchemaV1
} from '~lib/schema/connectedSite'
import type { IDerivedWallet } from '~lib/schema/derivedWallet'
import { derivedWalletSchemaV1 } from '~lib/schema/derivedWallet'
import { IHdPath, hdPathSchemaV1 } from '~lib/schema/hdPath'
import { INetwork, networkSchemaV1 } from '~lib/schema/network'
import { IQueryCache, queryCacheSchemaV1 } from '~lib/schema/queryCache'
import type { IWallet } from '~lib/schema/wallet'
import { walletSchemaV1 } from '~lib/schema/wallet'

export class Database extends Dexie {
  wallets!: Dexie.Table<IWallet, number>
  networks!: Dexie.Table<INetwork, number>
  hdPaths!: Dexie.Table<IHdPath, number>
  derivedWallets!: Dexie.Table<IDerivedWallet, number>
  chainAccounts!: Dexie.Table<IChainAccount, number>
  connectedSites!: Dexie.Table<IConnectedSite, number>
  queryCache!: Dexie.Table<IQueryCache, number>

  constructor() {
    super('database')
    this.version(1).stores({
      wallets: walletSchemaV1,
      networks: networkSchemaV1,
      hdPaths: hdPathSchemaV1,
      derivedWallets: derivedWalletSchemaV1,
      chainAccounts: chainAccountSchemaV1,
      connectedSites: connectedSiteSchemaV1,
      queryCache: queryCacheSchemaV1
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
