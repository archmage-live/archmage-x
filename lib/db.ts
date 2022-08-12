import Dexie from 'dexie'
import {
  Config,
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator
} from 'unique-names-generator'

import type { IDerivedWallet } from '~lib/schema/derivedWallet'
import { derivedWalletSchemaV1 } from '~lib/schema/derivedWallet'
import { IHdPath, hdPathSchemaV1 } from '~lib/schema/hdPath'
import { INetwork, networkSchemaV1 } from '~lib/schema/network'
import { IQueryCache, queryCacheSchemaV1 } from '~lib/schema/queryCache'
import type { IWallet } from '~lib/schema/wallet'
import { walletSchemaV1 } from '~lib/schema/wallet'
import { IWalletInfo, walletInfoSchemaV1 } from '~lib/schema/walletInfo'

export class Database extends Dexie {
  wallets!: Dexie.Table<IWallet, number>
  networks!: Dexie.Table<INetwork, number>
  hdPaths!: Dexie.Table<IHdPath, number>
  derivedWallets!: Dexie.Table<IDerivedWallet, number>
  walletInfos!: Dexie.Table<IWalletInfo, number>
  queryCache!: Dexie.Table<IQueryCache, number>

  constructor() {
    super('database')
    this.version(1).stores({
      wallets: walletSchemaV1,
      networks: networkSchemaV1,
      hdPaths: hdPathSchemaV1,
      derivedWallets: derivedWalletSchemaV1,
      walletInfos: walletInfoSchemaV1,
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
  key = 'name'
): Promise<string> {
  const cfg: Config = {
    dictionaries: [adjectives, colors, animals],
    separator: '-'
  }
  const name = uniqueNamesGenerator(cfg)

  if (!(await table.get({ [key]: name }))) {
    return name
  }
  for (let num = 2; ; num++) {
    const nameNum = `${name}-${num}`
    if (!(await table.get({ [key]: nameNum }))) {
      return nameNum
    }
  }
}
