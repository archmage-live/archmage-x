import assert from 'assert'
import { useLiveQuery } from 'dexie-react-hooks'
import { atom, useAtom } from 'jotai'
import { useCallback, useEffect, useState } from 'react'
// @ts-ignore
import stableHash from 'stable-hash'

import { WalletId, useActiveWalletId } from '~lib/active'
import { IChainAccount, INetwork, ISubWallet, IWallet } from '~lib/schema'
import { WALLET_SERVICE } from '~lib/services/walletService'

export interface WalletEntry {
  wallet: IWallet
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

function useWalletSelected(
  activeAsSelected = false
): [WalletId | undefined, (selected: WalletId | undefined) => void] {
  const [selected, setSelected] = useState<WalletId>()

  const { walletId: activeWallet, setWalletId: setActiveWallet } =
    useActiveWalletId()

  return [
    activeAsSelected ? activeWallet : selected,
    activeAsSelected ? setActiveWallet : setSelected
  ]
}

async function fetchWalletTree(network: INetwork): Promise<WalletEntry[]> {
  const wallets = await WALLET_SERVICE.getWallets()
  const subWallets = await WALLET_SERVICE.getSubWallets()
  const accounts = await WALLET_SERVICE.getChainAccounts({
    networkKind: network.kind,
    chainId: network.chainId
  })

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

export function useWalletTree(
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
      setFiltered(walletEntries)
    }
  }, [filter, walletEntries])

  useLiveQuery(async () => {
    if (!network) {
      return
    }

    const entries = await fetchWalletTree(network)

    setWalletEntries((oldEntries) => {
      const oldEntryMap = new Map(
        oldEntries?.map((entry) => [entry.wallet.id, entry])
      )

      let changed = entries.length !== oldEntries?.length

      const newEntries = entries.map((entry) => {
        const oldEntry = oldEntryMap.get(entry.wallet.id)
        if (!oldEntry) {
          changed = true
          return entry
        }

        const walletChanged = !isSameWallet(entry.wallet, oldEntry.wallet)

        const oldSubEntryMap = new Map(
          oldEntry.subWallets?.map((entry) => [entry.subWallet.id, entry])
        )

        let subChanged = entry.subWallets.length !== oldEntry.subWallets.length

        const subEntries = entry.subWallets.map((subEntry) => {
          const oldSubEntry = oldSubEntryMap.get(subEntry.subWallet.id)
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

  useEffect(() => {
    if (!selected || !walletEntries) {
      return
    }

    const notChanged = walletEntries.find((entry) => {
      if (entry.wallet.id !== selected.id) {
        return false
      }
      return entry.subWallets.find(
        (subEntry) =>
          subEntry.subWallet.id === selected.subId && subEntry.isSelected
      )
    })
    if (notChanged) {
      return
    }

    const found = walletEntries.find(({ wallet }) => wallet.id === selected.id)
    if (!found) {
      return
    }

    let changed = false
    const entries = walletEntries.map((entry) => {
      let subChanged = false
      let isOpen = undefined
      const subWallets = entry.subWallets.map((subEntry) => {
        if (subEntry.subWallet.id === selected.subId) {
          assert(entry.wallet.id === selected.id)
          subChanged = true
          isOpen = true
          return {
            ...subEntry,
            isSelected: true
          }
        } else if (subEntry.isSelected) {
          subChanged = true
          return {
            ...subEntry,
            isSelected: false
          }
        }
        return subEntry
      })
      if (!subChanged) {
        return entry
      }
      changed = true
      return {
        ...entry,
        isOpen: isOpen !== undefined ? isOpen : entry.isOpen,
        subWallets
      }
    })

    if (changed) {
      setWalletEntries(entries)
    }
  }, [selected, setWalletEntries, walletEntries])

  const setSelected = useCallback(
    (newSelected: WalletId) => {
      if (!walletEntries) {
        return
      }
      if (selected && newSelected.subId === selected.subId) {
        return
      }

      _setSelected(newSelected)
    },
    [_setSelected, selected, walletEntries]
  )

  const [checked, _setChecked] = useState<Map<number, WalletId>>(new Map())

  const setChecked = useCallback(
    (item: WalletId | number, isChecked: boolean) => {
      if (!walletEntries) {
        return
      }

      _setChecked((oldChecked) => {
        let checked = new Map(oldChecked.entries())
        let wallets = walletEntries.slice()
        if (typeof item === 'number') {
          const foundIndex = walletEntries.findIndex(
            (wallet) => wallet.wallet.id === item
          )
          assert(foundIndex > -1)

          wallets[foundIndex].subWallets?.forEach((subWallet) => {
            subWallet.isChecked = isChecked

            if (isChecked && !checked.has(subWallet.account.id)) {
              checked.set(subWallet.account.id, {
                id: subWallet.subWallet.masterId,
                subId: subWallet.subWallet.id
              })
            } else if (!isChecked && checked.has(subWallet.account.id)) {
              checked.delete(subWallet.account.id)
            }
          })
        } else {
          const { id, subId } = item

          const { changedWallets, changedSubWallet: subWallet } =
            markSubWalletItem(wallets, id, subId, undefined, isChecked)
          wallets = changedWallets

          if (isChecked) {
            checked.set(subWallet.account.id, {
              id: subWallet.subWallet.masterId,
              subId: subWallet.subWallet.id
            })
          } else {
            checked.delete(subWallet.account.id)
          }
        }

        setWalletEntries(wallets)

        return checked
      })
    },
    [setWalletEntries, walletEntries]
  )

  return {
    wallets: filtered,
    toggleOpen,
    selected,
    setSelected,
    checked,
    setChecked
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
  return a.id === b.id && a.sortId === b.sortId && a.name === b.name
}

export function isSameSubWallet(a: ISubWallet, b: ISubWallet) {
  return a.id === b.id && a.sortId === b.sortId && a.name === b.name
}

export function isSameAccount(a: IChainAccount, b: IChainAccount) {
  return a.id === b.id && stableHash(a.info) === stableHash(b.info)
}