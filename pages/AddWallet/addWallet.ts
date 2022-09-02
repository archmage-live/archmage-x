import assert from 'assert'
import { atom, useAtom } from 'jotai'
import { useCallback } from 'react'

import { NewWalletOpts, WALLET_SERVICE } from '~lib/services/walletService'
import { WalletType } from '~lib/wallet'

export enum AddWalletKind {
  NEW_HD,
  IMPORT_HD,
  IMPORT_MNEMONIC_PRIVATE_KEY,
  IMPORT_PRIVATE_KEY,
  IMPORT_WATCH_ADDRESS,
  IMPORT_WATCH_ADDRESS_GROUP,
  CONNECT_HARDWARE
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

    const opts = { name } as NewWalletOpts
    switch (addWalletKind) {
      case AddWalletKind.NEW_HD:
      // pass through
      case AddWalletKind.IMPORT_HD:
        opts.type = WalletType.HD
        opts.mnemonic = mnemonic.join(' ')
        break
      case AddWalletKind.IMPORT_MNEMONIC_PRIVATE_KEY:
        opts.type = WalletType.PRIVATE_KEY
        opts.mnemonic = mnemonic.join(' ')
        opts.path = hdPath
        break
      case AddWalletKind.IMPORT_PRIVATE_KEY:
        opts.type = WalletType.PRIVATE_KEY
        opts.privateKey = privateKey
        break
      case AddWalletKind.IMPORT_WATCH_ADDRESS:
        opts.type = WalletType.WATCH
        break
      case AddWalletKind.IMPORT_WATCH_ADDRESS_GROUP:
        opts.type = WalletType.WATCH_GROUP
        break
      default:
        throw new Error('unknown wallet type')
    }

    const { wallet, decrypted } = await WALLET_SERVICE.newWallet(opts)

    if (await WALLET_SERVICE.existsSecret(wallet)) {
      return { error: 'There exists wallet with the same secret' }
    }

    WALLET_SERVICE.createWallet(wallet, decrypted).finally(() => {
      setCreated(true)
    })

    return {}
  }, [addWalletKind, hdPath, mnemonic, name, privateKey, setCreated])
}
