import { atom, useAtom } from 'jotai'

export enum AddWalletKind {
  NEW_HD,
  IMPORT_HD,
  IMPORT_MNEMONIC_PRIVATE_KEY,
  IMPORT_PRIVATE_KEY,
  CONNECT_LEDGER
}

const passwordAtom = atom<string | undefined>(undefined)
const addWalletKindAtom = atom<AddWalletKind | undefined>(undefined)
const mnemonic = atom<string[] | undefined>(undefined)

export function usePassword() {
  return useAtom(passwordAtom)
}

export function useAddWalletKind() {
  return useAtom(addWalletKindAtom)
}

export function useMnemonic() {
  return useAtom(mnemonic)
}
