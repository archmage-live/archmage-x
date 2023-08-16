import assert from 'assert'
import { atom, useAtom } from 'jotai'
import { useCallback } from 'react'

import { DerivePosition, IWallet, PSEUDO_INDEX } from '~lib/schema'
import {
  AddSubWalletsOpts,
  NewWalletOpts,
  WALLET_SERVICE
} from '~lib/services/wallet'
import {
  AccountAbstractionInfo,
  BtcAddressType,
  Erc4337Info,
  HardwareWalletType,
  KeylessWalletInfo,
  MultisigWalletType,
  SafeOwner,
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
  MULTI_SIG,
  MULTI_SIG_GROUP,
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
const existingWalletAtom = atom<IWallet | undefined>(undefined)
const accountsAtom = atom<WalletAccount[]>([])
const accountsNumAtom = atom(0)
const hwTypeAtom = atom<HardwareWalletType | undefined>(undefined)
const hwTransportAtom = atom<'hid' | 'ble' | undefined>(undefined)
const walletHashAtom = atom<string>('')
const addressTypeAtom = atom<BtcAddressType | undefined>(undefined)
const keylessInfoAtom = atom<KeylessWalletInfo | undefined>(undefined)
const accountAbstractionAtom = atom<AccountAbstractionInfo | undefined>(
  undefined
)
const multisigTypeAtom = atom<MultisigWalletType | undefined>(undefined)
const owners = atom<SafeOwner[] | undefined>(undefined)
const threshold = atom<number | undefined>(undefined)
const saltNonce = atom<number | undefined>(undefined)
const erc4337Atom = atom<Erc4337Info | undefined>(undefined)
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
  return useAtom(existingWalletAtom)
}

export function useAccounts() {
  const [accounts, setAccounts] = useAtom(accountsAtom)

  const setAccountsCb = useCallback(
    (
      update:
        | WalletAccount[]
        | ((prevAccounts: WalletAccount[]) => WalletAccount[]),
      isGroup: boolean = false
    ) => {
      setAccounts((prevAccounts) => {
        let accounts
        if (Array.isArray(update)) {
          accounts = update
        } else {
          accounts = update(prevAccounts)
        }

        const accs = accounts.slice()
        let changed = false
        if (isGroup && accs[0]?.index === PSEUDO_INDEX) {
          accs[0].index = 0
          changed = true
        } else if (!isGroup && accs.length) {
          if (accs[0].index !== PSEUDO_INDEX) {
            accs[0].index = PSEUDO_INDEX
            changed = true
          }
          if (accs.length > 1) {
            accs.splice(1)
            changed = true
          }
        }

        return changed ? accs : accounts
      })
    },
    [setAccounts]
  )

  return [accounts, setAccountsCb] as [typeof accounts, typeof setAccountsCb]
}

export function useAccountsNum() {
  return useAtom(accountsNumAtom)
}

export function useHwType() {
  return useAtom(hwTypeAtom)
}

export function useHwTransport() {
  return useAtom(hwTransportAtom)
}

export function useWalletHash() {
  return useAtom(walletHashAtom)
}

export function useAddressType() {
  return useAtom(addressTypeAtom)
}

export function useMultisigType() {
  return useAtom(multisigTypeAtom)
}

export function useOwners() {
  return useAtom(owners)
}

export function useThreshold() {
  return useAtom(threshold)
}

export function useSaltNonce() {
  return useAtom(saltNonce)
}

export function useKeylessInfo() {
  return useAtom(keylessInfoAtom)
}

export function useAccountAbstraction() {
  return useAtom(accountAbstractionAtom)
}

export function useErc4337() {
  return useAtom(erc4337Atom)
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
  const [, setAccountsNum] = useAccountsNum()
  const [, setExistingWallet] = useExistingWallet()
  const [, setAddressType] = useAddressType()
  const [, setMultisigType] = useMultisigType()
  const [, setOwners] = useOwners()
  const [, setThreshold] = useThreshold()
  const [, setSaltNonce] = useSaltNonce()
  const [, setKeylessInfo] = useKeylessInfo()
  const [, setAccountAbstraction] = useAccountAbstraction()
  const [, setErc4337] = useErc4337()
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
    setAccountsNum(0)
    setExistingWallet(undefined)
    setAddressType(undefined)
    setMultisigType(undefined)
    setOwners(undefined)
    setThreshold(undefined)
    setSaltNonce(undefined)
    setKeylessInfo(undefined)
    setAccountAbstraction(undefined)
    setErc4337(undefined)
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
  const [accountsNum] = useAccountsNum()
  const [hwType] = useHwType()
  const [walletHash] = useWalletHash()
  const [addressType] = useAddressType()
  const [multisigType] = useMultisigType()
  const [owners] = useOwners()
  const [threshold] = useThreshold()
  const [saltNonce] = useSaltNonce()
  const [accountAbstraction] = useAccountAbstraction()
  const [erc4337] = useErc4337()
  const [keylessInfo] = useKeylessInfo()
  const [, setCreated] = useCreated()

  return useCallback(async (): Promise<{ error?: string }> => {
    if (name && (await WALLET_SERVICE.existsName(name))) {
      return { error: 'Existing name' }
    }

    const opts = { name, accountAbstraction, erc4337 } as NewWalletOpts
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

    if (erc4337 && opts.accounts) {
      opts.accounts = opts.accounts.map((account) => ({
        ...account,
        erc4337
      }))
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
      accountsNum,
      notBackedUp
    }).finally(() => {
      setCreated(true)
    })

    return {}
  }, [
    name,
    addWalletKind,
    accounts,
    accountsNum,
    notBackedUp,
    mnemonic,
    addressType,
    hdPath,
    hdPathTemplate,
    derivePosition,
    hwType,
    walletHash,
    keylessInfo,
    accountAbstraction,
    erc4337,
    setCreated
  ])
}

export function useAddSubWallets() {
  const [addWalletKind] = useAddWalletKind()
  const [accounts] = useAccounts()
  const [wallet] = useExistingWallet()
  const [erc4337] = useErc4337()
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
        break
      default:
        throw new Error('unknown wallet type')
    }

    if (erc4337 && opts.accounts) {
      opts.accounts = opts.accounts.map((account) => ({
        ...account,
        erc4337
      }))
    }

    WALLET_SERVICE.addSubWallets(opts).finally(() => {
      setCreated(true)
    })

    return {}
  }, [wallet, addWalletKind, accounts, erc4337, setCreated])
}
