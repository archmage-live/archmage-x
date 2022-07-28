import { entropyToMnemonic } from '@ethersproject/hdnode'
import { randomBytes } from '@ethersproject/random'
import { sha256 } from '@ethersproject/sha2'

import { Wallet } from '~lib/schema/wallet'
import { STORE, StoreKey } from '~lib/store'

class WalletService {
  password!: string

  async createPassword(password: string) {
    await STORE.set(
      StoreKey.PASSWORD_HASH,
      sha256(new TextEncoder().encode(password))
    )
    this.password = password
  }

  async checkPassword(password: string): Promise<boolean> {
    return (
      sha256(new TextEncoder().encode(password)) ===
      (await STORE.get(StoreKey.PASSWORD_HASH))
    )
  }

  generateMnemonic(opts?: { locale?: string }) {
    let entropy: Uint8Array = randomBytes(16)
    return entropyToMnemonic(entropy, opts?.locale)
  }

  async exists({ name, hash }: { name?: string; hash?: string }) {
    return Wallet.exists({ name, hash })
  }

  async newWallet(...wallet: Parameters<typeof Wallet.new>): Promise<{
    wallet: Wallet
    keystore: {
      encrypted: any
      decrypted: any
    }
  }> {
    return Wallet.new(...wallet)
  }

  async createWallet(
    wallet: Wallet,
    ...rest: Parameters<typeof wallet.create>
  ) {
    await wallet.create(...rest)
  }
}

export const WALLET_SERVICE = new WalletService()
