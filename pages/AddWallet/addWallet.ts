import { atom, useAtom } from 'jotai'
import { useCallback } from 'react'

import { WALLET_SERVICE } from '~lib/services/walletService'

export enum AddWalletKind {
  NEW_HD,
  IMPORT_HD,
  IMPORT_MNEMONIC_PRIVATE_KEY,
  IMPORT_PRIVATE_KEY,
  CONNECT_LEDGER
}

const passwordAtom = atom<string>('')
const addWalletKindAtom = atom<AddWalletKind>(AddWalletKind.NEW_HD)
const mnemonicAtom = atom<string[]>([])
const hdPathAtom = atom('')
const privateKeyAtom = atom('')
const nameAtom = atom('')
const finishedAtom = atom(false)

export function usePassword() {
  return useAtom(passwordAtom)
}

export function useAddWalletKind() {
  return useAtom(addWalletKindAtom)
}

export function useMnemonic() {
  return useAtom(mnemonicAtom)
}

export function useHdPath() {
  return useAtom(hdPathAtom)
}

export function usePrivateKey() {
  return useAtom(privateKeyAtom)
}

export function useName() {
  return useAtom(nameAtom)
}

export function useFinished() {
  return useAtom(finishedAtom)
}

export function useAddWallet() {
  const [password] = usePassword()
  const [addWalletKind] = useAddWalletKind()
  const [mnemonic] = useMnemonic()
  const [hdPath] = useHdPath()
  const [privateKey] = usePrivateKey()
  const [name] = useName()
  const [, setFinished] = useFinished()

  return useCallback(async (): Promise<{ error?: string }> => {
    if (name && (await WALLET_SERVICE.existsName(name))) {
      return { error: 'Invalid secret recovery phrase' }
    }

    const { wallet, decrypted, encrypted } = await WALLET_SERVICE.newWallet({
      password,
      isHD:
        addWalletKind === AddWalletKind.NEW_HD ||
        addWalletKind === AddWalletKind.IMPORT_HD,
      mnemonic: mnemonic.join(' '),
      path:
        addWalletKind === AddWalletKind.IMPORT_MNEMONIC_PRIVATE_KEY
          ? hdPath
          : undefined,
      privateKey,
      name
    })

    if (await WALLET_SERVICE.existsSecret(wallet)) {
      return { error: 'There exists wallet with the same secret' }
    }

    WALLET_SERVICE.createWallet(wallet, decrypted, encrypted).finally(() => {
      setFinished(true)
    })

    return {}
  }, [addWalletKind, hdPath, mnemonic, name, password, privateKey, setFinished])
}
