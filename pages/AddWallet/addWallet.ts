import assert from 'assert'
import { atom, useAtom } from 'jotai'
import { useCallback } from 'react'

import { NetworkKind } from '~lib/network'
import { DerivePosition, IWallet } from '~lib/schema'
import {
  AddSubWalletsOpts,
  NewWalletOpts,
  WALLET_SERVICE
} from '~lib/services/walletService'
import {
  HardwareWalletAccount,
  HardwareWalletType,
  WalletType
} from '~lib/wallet'

export enum AddWalletKind {
  NEW_HD,
  IMPORT_HD,
  IMPORT_MNEMONIC_PRIVATE_KEY,
  IMPORT_PRIVATE_KEY,
  IMPORT_PRIVATE_KEY_GROUP,
  IMPORT_WATCH_ADDRESS,
  IMPORT_WATCH_ADDRESS_GROUP,
  CONNECT_HARDWARE,
  CONNECT_HARDWARE_GROUP
}

const addWalletKindAtom = atom<AddWalletKind>(AddWalletKind.NEW_HD)
const nameAtom = atom('')
const mnemonicAtom = atom<string[]>([])
const mnemonicNotBackedUpAtom = atom<boolean>(false)
const hdPathAtom = atom('')
const derivePositionAtom = atom<DerivePosition | undefined>(undefined)
const privateKeyAtom = atom('')
const networkKindAtom = atom<NetworkKind>(NetworkKind.EVM)
const hwTypeAtom = atom<HardwareWalletType | undefined>(undefined)
const addressesAtom = atom<string[]>([])
const hwHash = atom<string>('')
const hwAccountsAtom = atom<HardwareWalletAccount[]>([])
const existingWallet = atom<IWallet | undefined>(undefined)
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

export function useMnemonicNotBackedUp() {
  return useAtom(mnemonicNotBackedUpAtom)
}

export function useHdPath() {
  return useAtom(hdPathAtom)
}

export function useDerivePosition() {
  return useAtom(derivePositionAtom)
}

export function usePrivateKey() {
  return useAtom(privateKeyAtom)
}

export function useNetworkKind() {
  return useAtom(networkKindAtom)
}

export function useHwType() {
  return useAtom(hwTypeAtom)
}

export function useAddresses() {
  return useAtom(addressesAtom)
}

export function useHwHash() {
  return useAtom(hwHash)
}

export function useHwAccounts() {
  return useAtom(hwAccountsAtom)
}

export function useExistingWallet() {
  return useAtom(existingWallet)
}

export function useCreated() {
  return useAtom(createdAtom)
}

export function useClear() {
  const [, setMnemonic] = useMnemonic()
  const [, setMnemonicNotBackedUp] = useMnemonicNotBackedUp()
  const [, setHdPath] = useHdPath()
  const [, setDerivePosition] = useDerivePosition()
  const [, setPrivateKey] = usePrivateKey()
  const [, setName] = useName()
  const [, setNetworkKind] = useNetworkKind()
  const [, setHwType] = useHwType()
  const [, setAddresses] = useAddresses()
  const [, setHwHash] = useHwHash()
  const [, setHwAccounts] = useHwAccounts()
  const [, setExistingWallet] = useExistingWallet()
  const [, setCreated] = useCreated()
  return useCallback(() => {
    setMnemonic([])
    setMnemonicNotBackedUp(false)
    setHdPath('')
    setDerivePosition(undefined)
    setPrivateKey('')
    setName('')
    setNetworkKind(NetworkKind.EVM)
    setHwType(undefined)
    setAddresses([])
    setHwHash('')
    setHwAccounts([])
    setExistingWallet(undefined)
    setCreated(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

export function useAddWallet() {
  const [addWalletKind] = useAddWalletKind()
  const [mnemonic] = useMnemonic()
  const [notBackedUp] = useMnemonicNotBackedUp()
  const [hdPath] = useHdPath()
  const [derivePosition] = useDerivePosition()
  const [privateKey] = usePrivateKey()
  const [name] = useName()
  const [networkKind] = useNetworkKind()
  const [hwType] = useHwType()
  const [addresses] = useAddresses()
  const [hwHash] = useHwHash()
  const [hwAccounts] = useHwAccounts()
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
      case AddWalletKind.CONNECT_HARDWARE:
        opts.type = WalletType.HW
        opts.networkKind = networkKind
        opts.hwType = hwType
        opts.hwAccounts = hwAccounts
        break
      case AddWalletKind.CONNECT_HARDWARE_GROUP:
        opts.type = WalletType.HW_GROUP
        opts.networkKind = networkKind
        opts.path = hdPath
        opts.derivePosition = derivePosition
        opts.hwType = hwType
        opts.hash = hwHash
        opts.hwAccounts = hwAccounts
        break
      default:
        throw new Error('unknown wallet type')
    }

    console.log(opts)
    const { wallet, decrypted } = await WALLET_SERVICE.newWallet(opts)

    if (await WALLET_SERVICE.existsSecret(wallet)) {
      return {
        error: 'There exists wallet with the same secret or unique identifier'
      }
    }

    WALLET_SERVICE.createWallet({
      wallet,
      decrypted,
      networkKind,
      addresses,
      hwAccounts,
      notBackedUp
    }).finally(() => {
      setCreated(true)
    })

    return {}
  }, [
    addWalletKind,
    addresses,
    derivePosition,
    hdPath,
    hwAccounts,
    hwHash,
    hwType,
    mnemonic,
    name,
    networkKind,
    notBackedUp,
    privateKey,
    setCreated
  ])
}

export function useAddSubWallets() {
  const [addWalletKind] = useAddWalletKind()
  const [networkKind] = useNetworkKind()
  const [addresses] = useAddresses()
  const [hwAccounts] = useHwAccounts()
  const [wallet] = useExistingWallet()
  const [, setCreated] = useCreated()

  return useCallback(async (): Promise<{ error?: string }> => {
    assert(wallet)
    const opts = { wallet } as AddSubWalletsOpts

    switch (addWalletKind) {
      case AddWalletKind.IMPORT_PRIVATE_KEY_GROUP:
        break
      case AddWalletKind.IMPORT_WATCH_ADDRESS_GROUP:
        break
      case AddWalletKind.CONNECT_HARDWARE_GROUP:
        opts.networkKind = networkKind
        opts.hwAccounts = hwAccounts
        break
      default:
        throw new Error('unknown wallet type')
    }

    WALLET_SERVICE.addSubWallets(opts).finally(() => {
      setCreated(true)
    })

    return {}
  }, [addWalletKind, hwAccounts, networkKind, setCreated, wallet])
}
