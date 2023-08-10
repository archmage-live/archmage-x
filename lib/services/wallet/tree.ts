import assert from 'assert'
import { useLiveQuery } from 'dexie-react-hooks'
import { atom, useAtom } from 'jotai'
import { useCallback, useEffect, useState } from 'react'
// @ts-ignore
import stableHash from 'stable-hash'

import { WalletId, useActiveWalletId } from '~lib/active'
import { IChainAccount, INetwork, ISubWallet, IWallet } from '~lib/schema'
import { WALLET_SERVICE } from '~lib/services/wallet'

export interface WalletEntry {
  wallet: IWallet
  isSelected: boolean
  isOpen: boolean
  subWallets: SubWalletEntry[]
}

export interface SubWalletEntry {
  subWallet: ISubWallet
  account: IChainAccount
  isSelected: boolean
  isChecked: boolean
}

const walletEntriesAtom = atom<WalletEntry[] | undefined>(undefined)

export function useReadonlyWalletTree() {
  const [walletEntries] = useAtom(walletEntriesAtom)
  return walletEntries
}

export interface SelectedWalletId {
  id: number
  subId?: number
}

function useWalletSelected(
  activeAsSelected = false
): [
  SelectedWalletId | undefined,
  (selected: SelectedWalletId | undefined) => void
] {
  const [selected, setSelected] = useState<SelectedWalletId>()

  const { walletId: activeWallet, setWalletId: setActiveWallet } =
    useActiveWalletId()

  return [
    activeAsSelected ? activeWallet : (selected as any),
    activeAsSelected ? setActiveWallet : (setSelected as any)
  ]
}

async function fetchWalletTree(network: INetwork): Promise<WalletEntry[]> {
  const wallets = await WALLET_SERVICE.getWallets()
  const subWallets = await WALLET_SERVICE.getSubWallets()
  const accounts = await WALLET_SERVICE.getChainAccounts(
    {
      networkKind: network.kind,
      chainId: network.chainId
    },
    true // no ensuring accounts, to avoid long waiting
  )

  const subWalletMap = new Map<number, ISubWallet[]>()
  for (const subWallet of subWallets) {
    let array = subWalletMap.get(subWallet.masterId)
    if (!array) {
      array = []
      subWalletMap.set(subWallet.masterId, array)
    }
    array.push(subWallet)
  }

  const accountMap = new Map<number, Map<number, IChainAccount>>()
  for (const account of accounts) {
    let map = accountMap.get(account.masterId)
    if (!map) {
      map = new Map()
      accountMap.set(account.masterId, map)
    }
    map.set(account.index, account)
  }

  return wallets
    .map((wallet) => {
      const subWallets = subWalletMap.get(wallet.id)
      const accounts = accountMap.get(wallet.id)
      return {
        wallet,
        isSelected: false,
        isOpen: false,
        subWallets:
          subWallets &&
          accounts &&
          subWallets
            .map((subWallet) => {
              return {
                subWallet,
                account: accounts.get(subWallet.index),
                isSelected: false,
                isChecked: false
              } as SubWalletEntry
            })
            .filter((subWallet) => !!subWallet.account)
      } as WalletEntry
    })
    .filter((wallet) => !!wallet.subWallets)
}

export function filterWalletTreeBySearch(
  entries: WalletEntry[],
  search: string
): WalletEntry[] {
  search = search.trim().toLowerCase()
  if (!search) {
    return entries
  }

  let isFiltered = false
  let filtered = []

  for (const entry of entries) {
    if (entry.wallet.name.toLowerCase().includes(search)) {
      filtered.push(entry)
      continue
    }

    let subWallets = []
    for (const subEntry of entry.subWallets) {
      if (subEntry.subWallet.name.toLowerCase().includes(search)) {
        subWallets.push(subEntry)
      } else if (subEntry.account.address?.toLowerCase().includes(search)) {
        subWallets.push(subEntry)
      }
    }

    if (!subWallets.length) {
      isFiltered = true
      continue
    }
    if (subWallets.length === entry.subWallets.length) {
      filtered.push(entry)
    } else {
      isFiltered = true
      filtered.push({
        ...entry,
        subWallets
      } as WalletEntry)
    }
  }

  if (filtered.length < entries.length) {
    isFiltered = true
  }

  return isFiltered ? filtered : entries
}

export function useWalletTree<
  Selected extends SelectedWalletId = SelectedWalletId
>(
  network?: INetwork,
  filter?: (entries: WalletEntry[]) => WalletEntry[],
  activeAsSelected = false
) {
  const [walletEntries, setWalletEntries] = useAtom(walletEntriesAtom)

  const [filtered, setFiltered] = useState<WalletEntry[] | undefined>()

  useEffect(() => {
    if (filter && walletEntries) {
      setFiltered(filter(walletEntries))
    } else {
      setFiltered(undefined)
    }
  }, [filter, walletEntries])

  useLiveQuery(async () => {
    if (!network) {
      return
    }

    const entries = await fetchWalletTree(network)

    setWalletEntries((oldEntries) => {
      let changed = entries.length !== oldEntries?.length

      const newEntries = entries.map((entry, index) => {
        const oldEntry = oldEntries?.[index]
        if (!oldEntry) {
          changed = true
          return entry
        }

        const walletChanged = !isSameWallet(entry.wallet, oldEntry.wallet)

        let subChanged = entry.subWallets.length !== oldEntry.subWallets.length

        const subEntries = entry.subWallets.map((subEntry, index) => {
          const oldSubEntry = oldEntry.subWallets[index]
          if (
            oldSubEntry &&
            isSameSubWallet(subEntry.subWallet, oldSubEntry.subWallet) &&
            isSameAccount(subEntry.account, oldSubEntry.account)
          ) {
            return oldSubEntry
          }
          subChanged = true
          if (!oldSubEntry) {
            return subEntry
          }
          return {
            ...oldSubEntry,
            subWallet: subEntry.subWallet,
            account: subEntry.account
          } as SubWalletEntry
        })

        if (walletChanged || subChanged) {
          changed = true
          return {
            ...oldEntry,
            wallet: walletChanged ? entry.wallet : oldEntry.wallet,
            subWallets: subChanged ? subEntries : oldEntry.subWallets
          } as WalletEntry
        } else {
          return oldEntry
        }
      })

      console.log(
        `useWalletTree, get all entries: changed ${changed}, entries: ${
          newEntries.length
        }, sub entries: ${newEntries.reduce(
          (sum, entry) => sum + entry.subWallets.length,
          0
        )}`
      )
      return changed ? newEntries : oldEntries
    })
  }, [network])

  const toggleOpen = useCallback(
    (id: number) => {
      setWalletEntries((entries) => {
        if (!entries) {
          return entries
        }
        const wallets = entries.slice()
        for (const wallet of wallets) {
          if (wallet.wallet.id === id) {
            wallet.isOpen = !wallet.isOpen
            break
          }
        }
        return wallets
      })
    },
    [setWalletEntries]
  )

  const [selected, _setSelected] = useWalletSelected(activeAsSelected)

  // set `isSelected` status of wallet tree, according to `selected`
  useEffect(() => {
    if (!walletEntries) {
      return
    }

    if (selected !== undefined) {
      const notChanged = walletEntries.find(
        ({ wallet, isSelected, subWallets }) => {
          if (wallet.id !== selected.id) {
            return false
          }
          if (!isSelected) {
            return false
          }
          if (selected.subId !== undefined) {
            return subWallets.find(
              (subEntry) =>
                subEntry.subWallet.id === selected.subId && subEntry.isSelected
            )
          } else {
            return subWallets.every((subEntry) => !subEntry.isSelected)
          }
        }
      )
      if (notChanged) {
        return
      }

      const found = walletEntries.find(
        ({ wallet }) => wallet.id === selected.id
      )
      if (!found) {
        return
      }
    } else {
      if (
        walletEntries.every(
          ({ isSelected, subWallets }) =>
            !isSelected && subWallets.every(({ isSelected }) => !isSelected)
        )
      ) {
        return
      }
    }

    let changed = false
    const entries = walletEntries.map((entry) => {
      const isSelected = entry.wallet.id === selected?.id
      const isChanged = isSelected !== entry.isSelected

      let isSubChanged = false
      const subWallets = entry.subWallets.map((subEntry) => {
        if (subEntry.subWallet.id === selected?.subId) {
          assert(entry.wallet.id === selected.id)
          isSubChanged = true
          return {
            ...subEntry,
            isSelected: true
          }
        } else if (subEntry.isSelected) {
          isSubChanged = true
          return {
            ...subEntry,
            isSelected: false
          }
        }
        return subEntry
      })

      if (!isChanged && !isSubChanged) {
        return entry
      }

      changed = true
      return {
        ...entry,
        isSelected,
        subWallets
      } as WalletEntry
    })

    if (changed) {
      setWalletEntries(entries)
    }
  }, [selected, setWalletEntries, walletEntries])

  const setSelected = useCallback(
    (newSelected: SelectedWalletId | undefined) => {
      if (!walletEntries || !newSelected) {
        _setSelected(undefined)
        return
      }
      if (
        selected &&
        newSelected.id === selected.id &&
        newSelected.subId === selected.subId
      ) {
        return
      }

      _setSelected(newSelected)
    },
    [_setSelected, selected, walletEntries]
  )

  // AccountId => WalletId
  const [checked, _setChecked] = useState<Map<number, WalletId>>(new Map())

  const setChecked = useCallback(
    (item: WalletId | number, isChecked: boolean) => {
      if (!walletEntries) {
        return
      }

      _setChecked((oldChecked) => {
        let checked = new Map(oldChecked.entries())
        let wallets = walletEntries.slice()
        let isChanged = false
        if (typeof item === 'number') {
          const foundIndex = walletEntries.findIndex(
            (wallet) => wallet.wallet.id === item
          )
          assert(foundIndex > -1)

          wallets[foundIndex].subWallets?.forEach((subWallet) => {
            subWallet.isChecked = isChecked

            if (isChecked && !checked.has(subWallet.account.id)) {
              isChanged = true
              checked.set(subWallet.account.id, {
                id: subWallet.subWallet.masterId,
                subId: subWallet.subWallet.id
              })
            } else if (!isChecked && checked.has(subWallet.account.id)) {
              isChanged = true
              checked.delete(subWallet.account.id)
            }
          })
        } else {
          const { id, subId } = item

          const { changedWallets, changedSubWallet: subWallet } =
            markSubWalletItem(wallets, id, subId, undefined, isChecked)
          wallets = changedWallets

          if (isChecked && !checked.has(subWallet.account.id)) {
            isChanged = true
            checked.set(subWallet.account.id, {
              id: subWallet.subWallet.masterId,
              subId: subWallet.subWallet.id
            })
          } else if (!isChecked && checked.has(subWallet.account.id)) {
            isChanged = true
            checked.delete(subWallet.account.id)
          }
        }

        if (isChanged) {
          setWalletEntries(wallets)
        }

        return checked
      })
    },
    [setWalletEntries, walletEntries]
  )

  const clearChecked = useCallback(() => {
    _setChecked((oldChecked) => {
      if (!oldChecked.size) {
        return oldChecked
      }
      return new Map()
    })

    setWalletEntries((oldEntries) => {
      if (!oldEntries) {
        return oldEntries
      }

      let isChanged = false
      const entries = oldEntries.map((entry) => {
        let isSubChanged = false
        const subWallets = entry.subWallets.map((subWallet) => {
          if (!subWallet.isChecked) {
            return subWallet
          }
          isSubChanged = true
          return {
            ...subWallet,
            isChecked: false
          }
        })

        if (!isSubChanged) {
          return entry
        }

        isChanged = true
        return {
          ...entry,
          subWallets
        }
      })

      return isChanged ? entries : oldEntries
    })
  }, [setWalletEntries])

  return {
    wallets: filter ? filtered : walletEntries,
    toggleOpen,
    selected: selected as Selected | undefined,
    setSelected: setSelected as (newSelected: Selected | undefined) => void,
    checked,
    setChecked,
    clearChecked
  }
}

function markSubWalletItem(
  wallets: WalletEntry[],
  walletId: number,
  subWalletId: number,
  isSelected?: boolean,
  isChecked?: boolean,
  cleanOthers?: boolean
) {
  const index = wallets.findIndex(({ wallet }) => wallet.id === walletId)
  assert(index > -1)

  let changedSubWallet: SubWalletEntry | undefined

  const changedSubWallets = wallets[index].subWallets?.map((item) => {
    if (item.subWallet.id === subWalletId) {
      changedSubWallet = {
        ...item,
        isSelected: isSelected !== undefined ? isSelected : item.isSelected,
        isChecked: isChecked !== undefined ? isChecked : item.isChecked
      }
      return changedSubWallet
    }
    if (
      cleanOthers &&
      ((isSelected !== undefined && item.isSelected) ||
        (isChecked !== undefined && item.isChecked))
    ) {
      return {
        ...item,
        isSelected: false,
        isChecked: false
      }
    }
    return item
  })

  assert(changedSubWallet)

  const changedWallets = wallets.slice()
  changedWallets[index].subWallets = changedSubWallets

  return {
    changedWallets,
    changedSubWallet
  }
}

export function isSameWallet(a: IWallet, b: IWallet) {
  return (
    a.id === b.id &&
    a.sortId === b.sortId &&
    a.name === b.name &&
    stableHash(a.info) === stableHash(b.info)
  )
}

export function isSameSubWallet(a: ISubWallet, b: ISubWallet) {
  return (
    a.id === b.id &&
    a.sortId === b.sortId &&
    a.name === b.name &&
    stableHash(a.info) === stableHash(b.info)
  )
}

export function isSameAccount(a: IChainAccount, b: IChainAccount) {
  return (
    a.id === b.id &&
    a.address === b.address &&
    stableHash(a.info) === stableHash(b.info)
  )
}
