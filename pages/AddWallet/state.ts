import { atom, useAtom } from 'jotai'

import { WalletType } from '~lib/wallet'

const passwordAtom = atom<string | undefined>(undefined)
const walletTypeAtom = atom<WalletType | undefined>(undefined)

export function usePassword() {
  return useAtom(passwordAtom)
}

export function useWalletType() {
  return useAtom(walletTypeAtom)
}
