import assert from 'assert'
import { atom, useAtom } from 'jotai'
import { useCallback } from 'react'

import { DerivePosition, IWallet } from '~lib/schema'
import {
  AddSubWalletsOpts,
  NewWalletOpts,
  WALLET_SERVICE
} from '~lib/services/wallet'
import {
  BtcAddressType,
  HardwareWalletType,
  KeylessWalletInfo,
  WalletAccount,
  WalletType
} from '~lib/wallet'

export enum AddWalletKind {
  NEW_HD,
  IMPORT_HD,
  IMPORT_PRIVATE_KEY,
  IMPORT_PRIVATE_KEY_GROUP,
  IMPORT_WATCH_ADDRESS,
  IMPORT_WATCH_ADDRESS_GROUP,
  CONNECT_HARDWARE,
  CONNECT_HARDWARE_GROUP,
  WALLET_CONNECT,
  WALLET_CONNECT_GROUP,
  KEYLESS,
  KEYLESS_HD,
  KEYLESS_GROUP
}

export const HardwareWalletTransports = [
  ['hid', 'USB/HID'],
  ['ble', 'Bluetooth']
]

const addWalletKindAtom = atom<AddWalletKind>(AddWalletKind.NEW_HD)
const nameAtom = atom('')
const mnemonicAtom = atom<string[]>([])
const mnemonicNotBackedUpAtom = atom<boolean>(false)
const hdPathAtom = atom('')
const hdPathTemplateAtom = atom('')
const derivePositionAtom = atom<DerivePosition | undefined>(undefined)
const existingWallet = atom<IWallet | undefined>(undefined)
const accountsAtom = atom<WalletAccount[]>([])
const hwTypeAtom = atom<HardwareWalletType | undefined>(undefined)
const hwTransportAtom = atom<'hid' | 'ble' | undefined>(undefined)
const walletHash = atom<string>('')
const addressType = atom<BtcAddressType | undefined>(undefined)
const keylessInfo = atom<KeylessWalletInfo | undefined>(undefined)
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

export function useHdPathTemplate() {
  return useAtom(hdPathTemplateAtom)
}

export function useDerivePosition() {
  return useAtom(derivePositionAtom)
}

export function useExistingWallet() {
  return useAtom(existingWallet)
}

export function useAccounts() {
  return useAtom(accountsAtom)
}

export function useHwType() {
  return useAtom(hwTypeAtom)
}

export function useHwTransport() {
  return useAtom(hwTransportAtom)
}

export function useWalletHash() {
  return useAtom(walletHash)
}

export function useAddressType() {
  return useAtom(addressType)
}

export function useKeylessInfo() {
  return useAtom(keylessInfo)
}

export function useCreated() {
  return useAtom(createdAtom)
}

export function useClear() {
  const [, setMnemonic] = useMnemonic()
  const [, setMnemonicNotBackedUp] = useMnemonicNotBackedUp()
  const [, setHdPath] = useHdPath()
  const [, setHdPathTemplate] = useHdPathTemplate()
  const [, setDerivePosition] = useDerivePosition()
  const [, setName] = useName()
  const [, setHwType] = useHwType()
  const [, setHwTransport] = useHwTransport()
  const [, setWalletHash] = useWalletHash()
  const [, setAccounts] = useAccounts()
  const [, setExistingWallet] = useExistingWallet()
  const [, setAddressType] = useAddressType()
  const [, setKeylessInfo] = useKeylessInfo()
  const [, setCreated] = useCreated()
  return useCallback(() => {
    setMnemonic([])
    setMnemonicNotBackedUp(false)
    setHdPath('')
    setHdPathTemplate('')
    setDerivePosition(undefined)
    setName('')
    setHwType(undefined)
    setHwTransport(undefined)
    setWalletHash('')
    setAccounts([])
    setExistingWallet(undefined)
    setAddressType(undefined)
    setKeylessInfo(undefined)
    setCreated(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

export function useAddWallet() {
  const [addWalletKind] = useAddWalletKind()
  const [mnemonic] = useMnemonic()
  const [notBackedUp] = useMnemonicNotBackedUp()
  const [hdPath] = useHdPath()
  const [hdPathTemplate] = useHdPathTemplate()
  const [derivePosition] = useDerivePosition()
  const [name] = useName()
  const [accounts] = useAccounts()
  const [hwType] = useHwType()
  const [walletHash] = useWalletHash()
  const [addressType] = useAddressType()
  const [keylessInfo] = useKeylessInfo()
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
        opts.addressType = addressType || BtcAddressType.NATIVE_SEGWIT
        break
      case AddWalletKind.IMPORT_PRIVATE_KEY:
        opts.type = WalletType.PRIVATE_KEY
        opts.accounts = accounts
        opts.addressType = addressType || BtcAddressType.NATIVE_SEGWIT
        break
      case AddWalletKind.IMPORT_PRIVATE_KEY_GROUP:
        opts.type = WalletType.PRIVATE_KEY_GROUP
        opts.accounts = accounts
        opts.addressType = addressType || BtcAddressType.NATIVE_SEGWIT
        break
      case AddWalletKind.IMPORT_WATCH_ADDRESS:
        opts.type = WalletType.WATCH
        opts.accounts = accounts
        opts.addressType = addressType
        break
      case AddWalletKind.IMPORT_WATCH_ADDRESS_GROUP:
        opts.type = WalletType.WATCH_GROUP
        opts.accounts = accounts
        opts.addressType = addressType
        break
      case AddWalletKind.WALLET_CONNECT:
        opts.type = WalletType.WALLET_CONNECT
        opts.accounts = accounts
        opts.addressType = addressType
        break
      case AddWalletKind.WALLET_CONNECT_GROUP:
        opts.type = WalletType.WALLET_CONNECT_GROUP
        opts.accounts = accounts
        opts.addressType = addressType
        break
      case AddWalletKind.CONNECT_HARDWARE:
        opts.type = WalletType.HW
        opts.path = hdPath
        opts.pathTemplate = hdPathTemplate
        opts.derivePosition = derivePosition
        opts.hwType = hwType
        opts.accounts = accounts
        opts.addressType = addressType
        break
      case AddWalletKind.CONNECT_HARDWARE_GROUP:
        opts.type = WalletType.HW_GROUP
        opts.path = hdPath
        opts.pathTemplate = hdPathTemplate
        opts.derivePosition = derivePosition
        opts.hwType = hwType
        opts.hash = walletHash
        opts.accounts = accounts
        opts.addressType = addressType
        break
      case AddWalletKind.KEYLESS_HD:
        opts.type = WalletType.KEYLESS_HD
        opts.hash = walletHash
        opts.accounts = accounts
        opts.keylessInfo = keylessInfo
        opts.addressType = addressType || BtcAddressType.NATIVE_SEGWIT
        break
      case AddWalletKind.KEYLESS:
        opts.type = WalletType.KEYLESS
        opts.accounts = accounts
        opts.keylessInfo = keylessInfo
        opts.addressType = addressType || BtcAddressType.NATIVE_SEGWIT
        break
      case AddWalletKind.KEYLESS_GROUP:
        opts.type = WalletType.KEYLESS_GROUP
        opts.accounts = accounts
        opts.addressType = addressType || BtcAddressType.NATIVE_SEGWIT
        break
      default:
        throw new Error('unknown wallet type')
    }

    const { wallet, decryptedKeystores } = await WALLET_SERVICE.newWallet(opts)

    if (await WALLET_SERVICE.existsSecret(wallet)) {
      return {
        error: 'There exists wallet with the same secret or unique identifier'
      }
    }

    WALLET_SERVICE.createWallet({
      wallet,
      decryptedKeystores,
      accounts,
      notBackedUp
    }).finally(() => {
      setCreated(true)
    })

    return {}
  }, [
    name,
    addWalletKind,
    accounts,
    notBackedUp,
    mnemonic,
    addressType,
    hdPath,
    hdPathTemplate,
    derivePosition,
    hwType,
    walletHash,
    keylessInfo,
    setCreated
  ])
}

export function useAddSubWallets() {
  const [addWalletKind] = useAddWalletKind()
  const [accounts] = useAccounts()
  const [wallet] = useExistingWallet()
  const [keylessInfo] = useKeylessInfo()
  const [, setCreated] = useCreated()

  return useCallback(async (): Promise<{ error?: string }> => {
    assert(wallet)
    const opts = { wallet } as AddSubWalletsOpts

    switch (addWalletKind) {
      case AddWalletKind.IMPORT_PRIVATE_KEY_GROUP:
        opts.accounts = accounts
        break
      case AddWalletKind.IMPORT_WATCH_ADDRESS_GROUP:
      // pass through
      case AddWalletKind.CONNECT_HARDWARE_GROUP:
      // pass through
      case AddWalletKind.WALLET_CONNECT_GROUP:
        opts.accounts = accounts
        break
      case AddWalletKind.KEYLESS_GROUP:
        opts.accounts = accounts
        opts.keylessInfo = keylessInfo
        break
      default:
        throw new Error('unknown wallet type')
    }

    WALLET_SERVICE.addSubWallets(opts).finally(() => {
      setCreated(true)
    })

    return {}
  }, [wallet, addWalletKind, accounts, keylessInfo, setCreated])
}
