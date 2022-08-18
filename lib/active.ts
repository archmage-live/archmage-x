import assert from 'assert'

import { IDerivedWallet, INetwork, IWallet, IWalletInfo } from '~lib/schema'
import { LOCAL_STORE, StoreKey } from '~lib/store'

import { DB } from './db'

export interface ActiveWalletId {
  masterId: number
  derivedId: number | undefined
}

export async function getActiveNetwork(): Promise<INetwork | undefined> {
  const networkId = await LOCAL_STORE.get<number | undefined>(
    StoreKey.SELECTED_NETWORK
  )
  if (!networkId) {
    return undefined
  }
  return DB.networks.get(networkId)
}

export async function setActiveNetwork(networkId: number) {
  await LOCAL_STORE.set(StoreKey.SELECTED_NETWORK, networkId)
}

export async function getActiveWallet(): Promise<
  | { wallet: IWallet; subWallet?: IDerivedWallet; walletInfo: IWalletInfo }
  | undefined
> {
  const activeId = await LOCAL_STORE.get<ActiveWalletId | undefined>(
    StoreKey.SELECTED_WALLET
  )
  if (!activeId) {
    return undefined
  }

  const wallet = await DB.wallets.get(activeId.masterId)
  assert(wallet)

  const subWallet =
    activeId.derivedId !== undefined
      ? await DB.derivedWallets.get(activeId.derivedId)
      : undefined

  const walletInfo = await DB.walletInfos
    .where({ masterId: wallet.id, index: subWallet?.index })
    .first()
  assert(walletInfo)

  return { wallet, subWallet, walletInfo }
}
