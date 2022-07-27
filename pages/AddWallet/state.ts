import { atom, useAtom } from 'jotai'

import { WalletType } from '~lib/wallet'

const walletTypeAtom = atom<WalletType | undefined>(undefined)

export function useWalletType() {
  return useAtom(walletTypeAtom)
}
