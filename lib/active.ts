import assert from 'assert'

import { IChainAccount, INetwork, ISubWallet, IWallet } from '~lib/schema'
import { WALLET_SERVICE } from '~lib/services/walletService'
import { LOCAL_STORE, StoreKey } from '~lib/store'

import { DB } from './db'

export interface ActiveWalletId {
  masterId: number
  derivedId: number
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
  | { wallet: IWallet; subWallet?: ISubWallet; chainAccount: IChainAccount }
  | undefined
> {
  const network = await getActiveNetwork()
  if (!network) {
    return undefined
  }

  const activeId = await LOCAL_STORE.get<ActiveWalletId | undefined>(
    StoreKey.SELECTED_WALLET
  )
  if (!activeId) {
    return undefined
  }

  const wallet = await DB.wallets.get(activeId.masterId)
  assert(wallet)

  const subWallet = await DB.subWallets.get(activeId.derivedId)
  assert(subWallet)

  const chainAccount = await WALLET_SERVICE.getChainAccount({
    masterId: wallet.id,
    index: subWallet.index,
    networkKind: network.kind,
    chainId: network.chainId
  })
  assert(chainAccount)

  return { wallet, subWallet, chainAccount }
}
