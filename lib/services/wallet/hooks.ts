import assert from 'assert'
import Dexie from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAsync } from 'react-use'

import { DB, getNextField } from '~lib/db'
import { NetworkKind } from '~lib/network'
import { ChainId, DerivePosition, IWallet, Index, SubIndex } from '~lib/schema'
import { WalletType, generatePath, getDerivePosition } from '~lib/wallet'

import { WALLET_SERVICE } from '.'

export function useWallets() {
  return useLiveQuery(() => {
    return WALLET_SERVICE.getWallets()
  })
}

export function useSubWallets(walletId?: number) {
  return useLiveQuery(async () => {
    if (walletId === undefined) {
      return undefined
    }
    return DB.subWallets
      .where('[masterId+sortId]')
      .between([walletId, Dexie.minKey], [walletId, Dexie.maxKey])
      .toArray()
  }, [walletId])
}

export function useSubWalletsCount(walletId?: number) {
  return useLiveQuery(() => {
    if (walletId === undefined) {
      return DB.subWallets.count()
    } else {
      return DB.subWallets.where('masterId').equals(walletId).count()
    }
  }, [walletId])
}

export function useChainAccountsByWallet(
  id?: number,
  networkKind?: NetworkKind,
  chainId?: number | string
) {
  return useLiveQuery(async () => {
    if (
      id === undefined ||
      networkKind === undefined ||
      chainId === undefined
    ) {
      return undefined
    }
    return WALLET_SERVICE.getChainAccounts({
      masterId: id,
      networkKind,
      chainId
    })
  }, [id, networkKind, chainId])
}

export function useChainAccounts(
  query?:
    | number[]
    | {
        networkKind: NetworkKind
        chainId: ChainId
        masterId?: number
        subIndices?: SubIndex[]
      }
) {
  return useLiveQuery(async () => {
    if (query === undefined) {
      return
    }
    return WALLET_SERVICE.getChainAccounts(query)
  }, [query])
}

export function useChainAccount(id?: number) {
  return useLiveQuery(async () => {
    if (id === undefined) {
      return undefined
    }
    return WALLET_SERVICE.getChainAccount(id)
  }, [id])
}

export function useChainAccountByIndex(
  masterId?: number,
  networkKind?: NetworkKind,
  chainId?: number | string,
  index?: Index
) {
  return useLiveQuery(async () => {
    if (
      masterId === undefined ||
      networkKind === undefined ||
      chainId === undefined ||
      index === undefined
    ) {
      return undefined
    }
    return WALLET_SERVICE.getChainAccount({
      masterId,
      networkKind,
      chainId,
      index
    })
  }, [masterId, networkKind, chainId, index])
}

export function useWallet(id?: number, hash?: string) {
  return useLiveQuery(() => {
    if (id === undefined && !hash) {
      return undefined
    }
    return WALLET_SERVICE.getWallet(id, hash)
  }, [id, hash])
}

export function useSubWallet(id?: number) {
  return useLiveQuery(async () => {
    if (id === undefined) {
      return undefined
    }
    return await WALLET_SERVICE.getSubWallet(id)
  }, [id])
}

export function useSubWalletByIndex(masterId?: number, index?: Index) {
  return useLiveQuery(() => {
    if (masterId === undefined || index === undefined) {
      return undefined
    }
    return WALLET_SERVICE.getSubWallet({ masterId, index })
  }, [masterId, index])
}

export function useHdPath(
  networkKind?: NetworkKind,
  wallet?: IWallet,
  index?: number
): [string | undefined, DerivePosition | undefined] {
  return (
    useLiveQuery(async () => {
      if (
        !networkKind ||
        !wallet ||
        (wallet.type !== WalletType.HD &&
          wallet.type !== WalletType.HW &&
          wallet.type !== WalletType.HW_GROUP) ||
        typeof index !== 'number'
      ) {
        return
      }

      if (wallet.type === WalletType.HW) {
        return [wallet.info.path!, undefined]
      } else if (wallet.type === WalletType.HW_GROUP) {
        return [
          generatePath(wallet.info.path!, index, wallet.info.derivePosition),
          wallet.info.derivePosition
        ]
      }

      const hdPath = await WALLET_SERVICE.getHdPath(wallet.id, networkKind)
      if (!hdPath) {
        return
      }
      const position = getDerivePosition(hdPath, networkKind)
      return [generatePath(hdPath.path, index, position), position]
    }, [networkKind, wallet, index]) || [undefined, undefined]
  )
}

export function useHdPaths(
  walletId?: number
): Map<NetworkKind, string> | undefined {
  return useLiveQuery(async () => {
    if (walletId === undefined) {
      return undefined
    }
    const m = new Map<NetworkKind, string>()
    const hdPaths = await WALLET_SERVICE.getHdPaths(walletId)
    for (const hdPath of hdPaths) {
      m.set(hdPath.networkKind, hdPath.path)
    }
    return m
  }, [walletId])
}

export interface ExistingGroupWallet {
  wallet: IWallet
  hashes: string[]
}

export function useExistingGroupWallets(
  walletType: WalletType,
  networkKind?: NetworkKind
) {
  const wallets = useWallets()

  return useLiveQuery(async () => {
    switch (walletType) {
      case WalletType.PRIVATE_KEY_GROUP:
      case WalletType.WATCH_GROUP:
      case WalletType.HW_GROUP: // hw group not used here
      case WalletType.WALLET_CONNECT_GROUP:
      case WalletType.MPC_GROUP:
      case WalletType.MULTI_SIG_GROUP:
        break
      default:
        assert(false, 'not group wallet')
    }

    if (!wallets) {
      return
    }

    const groupWallets = wallets.filter((w) => w.type === walletType)
    if (!groupWallets.length) {
      return []
    }

    const subWallets = await DB.subWallets
      .where('masterId')
      .anyOf(groupWallets.map((w) => w.id))
      .toArray()

    const walletMap = new Map<number, string[]>()
    for (const subWallet of subWallets) {
      // filter by network kind
      if (
        networkKind &&
        subWallet.info.networkKind &&
        subWallet.info.networkKind !== networkKind
      ) {
        continue
      }
      assert(subWallet.hash)
      let hashes = walletMap.get(subWallet.masterId)
      if (!hashes) {
        hashes = []
      }
      hashes.push(subWallet.hash)
      walletMap.set(subWallet.masterId, hashes)
    }

    return groupWallets
      .filter((wallet) => walletMap.has(wallet.id))
      .map(
        (wallet) =>
          ({
            wallet,
            hashes: walletMap.get(wallet.id)!
          } as ExistingGroupWallet)
      )
  }, [walletType, networkKind, wallets])
}

export function useNextSubWalletIndex(walletId?: number) {
  const { value } = useAsync(async () => {
    if (walletId !== undefined) {
      return await getNextField(DB.subWallets, 'index', {
        key: 'masterId',
        value: walletId
      })
    } else {
      return 0
    }
  }, [walletId])

  return value
}
