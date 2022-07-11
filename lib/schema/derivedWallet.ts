import { db } from '~lib/db'

export interface IDerivedWallet {
  id?: number
  masterId: number // master wallet id
  prefixPath: string // hd derivation path prefix
  index: number
  name: string // may not unique
}

export const derivedWalletSchemaV1 = '++id, &[masterId+prefixPath+index]'

const namePrefix = 'Wallet-'

export class DerivedWallet implements IDerivedWallet {
  id!: number
  masterId!: number
  prefixPath!: string
  index!: number
  name!: string

  constructor(derivedWallet: IDerivedWallet) {
    Object.assign(this, derivedWallet)
  }

  get path(): string {
    return `${this.prefixPath}/${this.index}`
  }

  static derive({
    masterId,
    prefixPath,
    index,
    name
  }: {
    masterId: number
    prefixPath: string
    index: number
    name?: string
  }): DerivedWallet {
    return new DerivedWallet({
      masterId,
      prefixPath,
      index,
      name: name || `${namePrefix}${index}`
    })
  }

  async exists() {
    return (
      (await db.derivedWallets
        .where('[masterId+prefixPath+index]')
        .equals([this.masterId, this.prefixPath, this.index])
        .count()) > 0
    )
  }

  async create() {
    this.id = await db.derivedWallets.add(this)
  }

  async delete() {
    await db.wallets.delete(this.id)
  }
}
