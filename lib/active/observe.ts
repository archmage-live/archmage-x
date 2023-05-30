import { LOCAL_STORE, StoreKey } from '~lib/store'

export function watchActiveNetworkChange(handler: () => void) {
  LOCAL_STORE.watch({
    [StoreKey.ACTIVE_NETWORK]: handler
  })
}

export function watchActiveWalletChange(handler: () => void) {
  LOCAL_STORE.watch({
    [StoreKey.ACTIVE_WALLET]: handler
  })
}
