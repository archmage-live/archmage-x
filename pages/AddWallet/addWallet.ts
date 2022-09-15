import { atom, useAtom } from 'jotai'
import { useCallback } from 'react'

import { NetworkKind } from '~lib/network'
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
const nameAtom = atom('')
const mnemonicAtom = atom<string[]>([])
const hdPathAtom = atom('')
const privateKeyAtom = atom('')
const networkKindAtom = atom<NetworkKind>(NetworkKind.EVM)
const addressesAtom = atom<string[]>([])
const createdAtom = atom(false)

export function useAddWalletKind() {
  return useAtom(addWalletKindAtom)
}

export function useName() {
  return useAtom(nameAtom)
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

export function useNetworkKind() {
  return useAtom(networkKindAtom)
}

export function useAddresses() {
  return useAtom(addressesAtom)
}

export function useCreated() {
  return useAtom(createdAtom)
}

export function useClear() {
  const [, setMnemonic] = useMnemonic()
  const [, setHdPath] = useHdPath()
  const [, setPrivateKey] = usePrivateKey()
  const [, setName] = useName()
  const [, setNetworkKind] = useNetworkKind()
  const [, setAddresses] = useAddresses()
  const [, setCreated] = useCreated()
  return useCallback(() => {
    setMnemonic([])
    setHdPath('')
    setPrivateKey('')
    setName('')
    setNetworkKind(NetworkKind.EVM)
    setAddresses([])
    setCreated(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

export function useAddWallet() {
  const [addWalletKind] = useAddWalletKind()
  const [mnemonic] = useMnemonic()
  const [hdPath] = useHdPath()
  const [privateKey] = usePrivateKey()
  const [name] = useName()
  const [networkKind] = useNetworkKind()
  const [addresses] = useAddresses()
  const [, setCreated] = useCreated()

  return useCallback(async (): Promise<{ error?: string }> => {
    if (name && (await WALLET_SERVICE.existsName(name))) {
      return { error: 'Existing name' }
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
        opts.networkKind = networkKind
        opts.addresses = addresses
        break
      case AddWalletKind.IMPORT_WATCH_ADDRESS_GROUP:
        opts.type = WalletType.WATCH_GROUP
        opts.networkKind = networkKind
        opts.addresses = addresses
        break
      default:
        throw new Error('unknown wallet type')
    }

    const { wallet, decrypted } = await WALLET_SERVICE.newWallet(opts)

    if (await WALLET_SERVICE.existsSecret(wallet)) {
      return { error: 'There exists wallet with the same secret' }
    }

    WALLET_SERVICE.createWallet({
      wallet,
      decrypted,
      networkKind,
      addresses
    }).finally(() => {
      setCreated(true)
    })

    return {}
  }, [
    addWalletKind,
    addresses,
    hdPath,
    mnemonic,
    name,
    networkKind,
    privateKey,
    setCreated
  ])
}
