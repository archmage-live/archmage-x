import {
  Button,
  Checkbox,
  Stack,
  chakra,
  useDisclosure
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { useWizard } from 'react-use-wizard'

import { AlertBox } from '~components/AlertBox'
import { PSEUDO_INDEX } from '~lib/schema'
import {
  ExistingGroupWallet,
  useNextSubWalletIndex
} from '~lib/services/wallet'
import { KeylessWalletInfo, WalletType, checkPrivateKey } from '~lib/wallet'

import { NameInput } from '../NameInput'
import {
  SelectExistingWalletModal,
  WalletItemButton
} from '../SelectExistingWallet'
import {
  AddWalletKind,
  useAccounts,
  useAddSubWallets,
  useAddWallet,
  useAddWalletKind,
  useExistingWallet,
  useKeylessInfo,
  useName
} from '../addWallet'
import { OnboardKeylessInfo } from './OnboardInfo'

export const OnboardKeylessPrivateKey = ({
  privateKey,
  info
}: {
  privateKey: string
  info: KeylessWalletInfo
}) => {
  const { nextStep } = useWizard()

  const [, setAddWalletKind] = useAddWalletKind()
  const [, setExistingWallet] = useExistingWallet()
  const [, setKeylessInfo] = useKeylessInfo()
  const [privateKeys, setPrivateKeys] = useState<string[]>([])
  const [accounts, setAccounts] = useAccounts()
  const [name, setName] = useName()
  useEffect(() => {
    setAddWalletKind(AddWalletKind.KEYLESS)
    setPrivateKeys([privateKey])
    setName('')
  }, [setAddWalletKind, setName, privateKey])

  const [willAddToExistingGroupChecked, setWillAddToExistingGroupChecked] =
    useState(false)
  const [existingGroupWallet, setExistingGroupWallet] = useState<
    ExistingGroupWallet | undefined
  >(undefined)
  const [isUseGroupChecked, setIsUseGroupChecked] = useState(false)
  useEffect(() => {
    setWillAddToExistingGroupChecked(false)
    setExistingGroupWallet(undefined)
  }, [])
  useEffect(() => {
    setExistingWallet(existingGroupWallet?.wallet)
  }, [setExistingWallet, existingGroupWallet])
  useEffect(() => {
    setIsUseGroupChecked(willAddToExistingGroupChecked)
  }, [willAddToExistingGroupChecked])

  useEffect(() => {
    if (!isUseGroupChecked) {
      setPrivateKeys((privateKeys) => [privateKeys[0]])
    }
    setAddWalletKind(
      !isUseGroupChecked ? AddWalletKind.KEYLESS : AddWalletKind.KEYLESS_GROUP
    )
  }, [isUseGroupChecked, setAddWalletKind, setPrivateKeys])

  const [alert, setAlert] = useState('')
  useEffect(() => {
    setAlert('')
  }, [privateKeys, name])

  const addWallet = useAddWallet()
  const addSubWallets = useAddSubWallets()

  const nextIndex = useNextSubWalletIndex(existingGroupWallet?.wallet.id)

  useEffect(() => {
    if (isUseGroupChecked && nextIndex === undefined) {
      return
    }
    setKeylessInfo(info)
    setAccounts(
      privateKeys.map((privateKey, i) => {
        const w = checkPrivateKey(privateKey)
        return {
          index: isUseGroupChecked ? nextIndex! + i : PSEUDO_INDEX,
          hash: w ? w.address : '',
          keyless: info
        }
      })
    )
  }, [
    info,
    privateKeys,
    isUseGroupChecked,
    setKeylessInfo,
    setAccounts,
    nextIndex
  ])

  const onImport = useCallback(async () => {
    let hashes = accounts.map(({ hash }) => hash)
    if (!hashes.every(Boolean)) {
      setAlert('Invalid keyless account')
      return
    }
    if (
      new Set(hashes.concat(existingGroupWallet?.hashes || [])).size !==
      hashes.length + (existingGroupWallet?.hashes.length || 0)
    ) {
      setAlert('Duplicate keyless account')
      return
    }

    if (!willAddToExistingGroupChecked) {
      const { error } = await addWallet()
      if (error) {
        setAlert(error)
        return
      }
    } else {
      const { error } = await addSubWallets()
      if (error) {
        setAlert(error)
        return
      }
    }

    nextStep().then()
  }, [
    accounts,
    existingGroupWallet,
    willAddToExistingGroupChecked,
    addWallet,
    addSubWallets,
    nextStep
  ])

  const {
    isOpen: isSelectOpen,
    onOpen: onSelectOpen,
    onClose: onSelectClose
  } = useDisclosure()

  return (
    <Stack spacing={12}>
      <OnboardKeylessInfo info={info} />

      <Stack spacing={8}>
        <Stack>
          <Checkbox
            size="lg"
            colorScheme="purple"
            isChecked={willAddToExistingGroupChecked}
            onChange={(e) => {
              if (e.target.checked) {
                onSelectOpen()
              } else {
                setWillAddToExistingGroupChecked(false)
                setExistingGroupWallet(undefined)
              }
            }}>
            <chakra.span color="gray.500" fontSize="lg">
              Add account to an existing keyless group wallet.
            </chakra.span>
          </Checkbox>

          {existingGroupWallet && (
            <WalletItemButton
              wallet={existingGroupWallet}
              onClick={onSelectOpen}
              buttonVariant="outline"
            />
          )}
        </Stack>

        {!willAddToExistingGroupChecked && (
          <Checkbox
            size="lg"
            colorScheme="purple"
            isChecked={isUseGroupChecked}
            onChange={(e) => setIsUseGroupChecked(e.target.checked)}>
            <chakra.span color="gray.500" fontSize="lg">
              Create group to manage multiple accounts.
            </chakra.span>
          </Checkbox>
        )}

        {!willAddToExistingGroupChecked && (
          <NameInput
            value={name}
            onChange={setName}
            placeholder={
              isUseGroupChecked ? 'Group Name (Optional)' : undefined
            }
          />
        )}

        <AlertBox>{alert}</AlertBox>
      </Stack>

      <Button
        h="14"
        size="lg"
        colorScheme="purple"
        borderRadius="8px"
        isDisabled={!privateKeys.length || !privateKeys.every(Boolean)}
        onClick={onImport}>
        Continue
      </Button>

      <SelectExistingWalletModal
        walletType={WalletType.KEYLESS_GROUP}
        selected={existingGroupWallet}
        onSelected={(w) => {
          setWillAddToExistingGroupChecked(true)
          setExistingGroupWallet(w)
        }}
        isOpen={isSelectOpen}
        onClose={onSelectClose}
      />
    </Stack>
  )
}
