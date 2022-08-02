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
import { IQueryCache, queryCacheSchemaV1 } from '~lib/schema/queryCache'
import type { IWallet } from '~lib/schema/wallet'
import { walletSchemaV1 } from '~lib/schema/wallet'

export class Database extends Dexie {
  wallets!: Dexie.Table<IWallet, number>
  derivedWallets!: Dexie.Table<IDerivedWallet, number>
  queryCache!: Dexie.Table<IQueryCache, number>

  constructor() {
    super('database')
    this.version(1).stores({
      wallets: walletSchemaV1,
      derivedWallets: derivedWalletSchemaV1,
      queryCache: queryCacheSchemaV1
    })
  }
}

// Global db singleton
export const DB = new Database()

type StringLiteral<T> = T extends `${string & T}` ? T : never

export async function getNextSortId<
  K,
  T extends { [P in StringLiteral<K>]: number }
>(table: Dexie.Table<T>, key = 'sortId' as StringLiteral<K>): Promise<number> {
  const lastBySortId = await table.orderBy(key).last()
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
