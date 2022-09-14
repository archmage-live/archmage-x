import assert from 'assert'
import { useLiveQuery } from 'dexie-react-hooks'
import { atom, useAtom } from 'jotai'
import { useCallback, useEffect, useState } from 'react'

import { WalletId, useActiveWallet } from '~lib/active'
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
const selectedAtom = atom<WalletId | undefined>(undefined)

export function useWalletTree(network?: INetwork, activeAsSelected = false) {
  const [walletEntries, setWalletEntries] = useAtom(walletEntriesAtom)

  const { walletId: activeWallet, setWalletId: setActiveWallet } =
    useActiveWallet()

  useLiveQuery(async () => {
    if (!network) {
      return
    }

    const wallets = await WALLET_SERVICE.getWallets()
    const entries = wallets.map((wallet) => {
      return {
        wallet,
        isOpen: false
      } as WalletEntry
    })

    const promises = []
    for (const entry of entries) {
      const async = async () => {
        const subWallets = await WALLET_SERVICE.getSubWallets(entry.wallet.id)

        const accounts = await WALLET_SERVICE.getChainAccounts({
          masterId: entry.wallet.id,
          networkKind: network.kind,
          chainId: network.chainId
        })
        const accountMap = new Map(
          accounts.map((account) => [account.index, account])
        )

        entry.subWallets = subWallets.map((subWallet) => {
          const account = accountMap.get(subWallet.index)
          assert(account)
          return {
            subWallet,
            account,
            isChecked: false,
            isSelected: false
          } as SubWalletEntry
        })
      }
      promises.push(async())
    }

    await Promise.all(promises)

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

        const oldSubEntryMap = new Map(
          oldEntry.subWallets?.map((entry) => [entry.subWallet.id, entry])
        )

        let subChanged = entry.subWallets.length !== oldEntry.subWallets.length

        const subEntries = entry.subWallets.map((subEntry) => {
          const oldSubEntry = oldSubEntryMap.get(subEntry.subWallet.id)
          if (oldSubEntry && oldSubEntry.account.id === subEntry.account.id) {
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

        if (subChanged) {
          changed = true
        }

        return {
          ...oldEntry,
          subWallets: subChanged ? subEntries : oldEntry.subWallets
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

  const [selected, _setSelected] = useAtom(selectedAtom)

  useEffect(() => {
    const newSelected = activeAsSelected ? activeWallet : selected
    if (!newSelected) {
      return
    }
    if (!walletEntries) {
      return
    }

    const notChanged = walletEntries.find((entry) => {
      if (entry.wallet.id !== newSelected.id) {
        return false
      }
      return entry.subWallets.find(
        (subEntry) =>
          subEntry.subWallet.id === newSelected.subId && subEntry.isSelected
      )
    })
    if (notChanged) {
      return
    }

    const { changedWallets } = markSubWalletItem(
      walletEntries.slice(),
      newSelected.id,
      newSelected.subId,
      true,
      undefined,
      true
    )

    for (const wallet of changedWallets) {
      if (wallet.wallet.id === newSelected.id) {
        wallet.isOpen = true
        break
      }
    }

    setWalletEntries(changedWallets)
  }, [
    activeAsSelected,
    activeWallet,
    selected,
    walletEntries,
    setWalletEntries
  ])

  const setSelected = useCallback(
    (newSelected: WalletId) => {
      if (!walletEntries) {
        return
      }
      const oldSelected = activeAsSelected ? activeWallet : selected
      if (oldSelected && newSelected.subId === oldSelected.subId) {
        return
      }

      if (activeAsSelected) {
        setActiveWallet(newSelected)
      } else {
        _setSelected(newSelected)
      }
    },
    [
      _setSelected,
      activeAsSelected,
      activeWallet,
      selected,
      setActiveWallet,
      walletEntries
    ]
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
    wallets: walletEntries,
    toggleOpen,
    selected: activeAsSelected ? activeWallet : selected,
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
