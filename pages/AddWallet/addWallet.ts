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

const addWalletKindAtom = atom<AddWalletKind>(AddWalletKind.NEW_HD)
const mnemonicAtom = atom<string[]>([])
const hdPathAtom = atom('')
const privateKeyAtom = atom('')
const nameAtom = atom('')
const createdAtom = atom(false)

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

export function useCreated() {
  return useAtom(createdAtom)
}

export function useClear() {
  const [, setMnemonic] = useMnemonic()
  const [, setHdPath] = useHdPath()
  const [, setPrivateKey] = usePrivateKey()
  const [, setName] = useName()
  const [, setCreated] = useCreated()
  return useCallback(() => {
    setMnemonic([])
    setHdPath('')
    setPrivateKey('')
    setName('')
    setCreated(false)
  }, [setCreated, setHdPath, setMnemonic, setName, setPrivateKey])
}

export function useAddWallet() {
  const [addWalletKind] = useAddWalletKind()
  const [mnemonic] = useMnemonic()
  const [hdPath] = useHdPath()
  const [privateKey] = usePrivateKey()
  const [name] = useName()
  const [, setCreated] = useCreated()

  return useCallback(async (): Promise<{ error?: string }> => {
    if (name && (await WALLET_SERVICE.existsName(name))) {
      return { error: 'Invalid secret recovery phrase' }
    }

    const isHD =
      addWalletKind === AddWalletKind.NEW_HD ||
      addWalletKind === AddWalletKind.IMPORT_HD

    const { wallet, decrypted } = await WALLET_SERVICE.newWallet({
      isHD,
      mnemonic:
        isHD || addWalletKind === AddWalletKind.IMPORT_MNEMONIC_PRIVATE_KEY
          ? mnemonic.join(' ')
          : undefined,
      path:
        addWalletKind === AddWalletKind.IMPORT_MNEMONIC_PRIVATE_KEY
          ? hdPath
          : undefined,
      privateKey:
        addWalletKind === AddWalletKind.IMPORT_PRIVATE_KEY
          ? privateKey
          : undefined,
      name
    })

    if (await WALLET_SERVICE.existsSecret(wallet)) {
      return { error: 'There exists wallet with the same secret' }
    }

    WALLET_SERVICE.createWallet(wallet, decrypted).finally(() => {
      setCreated(true)
    })

    return {}
  }, [addWalletKind, hdPath, mnemonic, name, privateKey, setCreated])
}
