import { AddIcon, MinusIcon } from '@chakra-ui/icons'
import {
  Button,
  Checkbox,
  HStack,
  IconButton,
  Stack,
  Textarea,
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
import { WalletType, checkPrivateKey } from '~lib/wallet'
import {
  SelectExistingWalletModal,
  WalletItemButton
} from '~pages/AddWallet/SelectExistingWallet'

import { AccountAbstractionChecker } from '../AccountAbstractionChecker'
import { NameInput } from '../NameInput'
import {
  AddWalletKind,
  useAccounts,
  useAddSubWallets,
  useAddWallet,
  useAddWalletKind,
  useExistingWallet,
  useName
} from '../addWallet'

export const ImportPrivateKey = () => {
  const { nextStep } = useWizard()

  const [, setAddWalletKind] = useAddWalletKind()
  const [, setExistingWallet] = useExistingWallet()
  const [privateKeys, setPrivateKeys] = useState<string[]>([])
  const [accounts, setAccounts] = useAccounts()
  const [name, setName] = useName()
  useEffect(() => {
    setAddWalletKind(AddWalletKind.IMPORT_PRIVATE_KEY)
    setPrivateKeys([''])
    setName('')
  }, [setAddWalletKind, setName])

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
      !isUseGroupChecked
        ? AddWalletKind.IMPORT_PRIVATE_KEY
        : AddWalletKind.IMPORT_PRIVATE_KEY_GROUP
    )
  }, [isUseGroupChecked, setAddWalletKind, setPrivateKeys])

  const [alert, setAlert] = useState('')
  useEffect(() => {
    setAlert('')
  }, [privateKeys, name, willAddToExistingGroupChecked, isUseGroupChecked])

  const addWallet = useAddWallet()
  const addSubWallets = useAddSubWallets()

  const nextIndex = useNextSubWalletIndex(existingGroupWallet?.wallet.id)

  useEffect(() => {
    if (isUseGroupChecked && nextIndex === undefined) {
      return
    }
    setAccounts(
      privateKeys.map((privateKey, i) => {
        const w = checkPrivateKey(privateKey)
        return {
          index: isUseGroupChecked ? nextIndex! + i : PSEUDO_INDEX,
          hash: w ? w.address : '',
          privateKey: w ? w.privateKey : ''
        }
      }),
      isUseGroupChecked
    )
  }, [privateKeys, isUseGroupChecked, setAccounts, nextIndex])

  const onImport = useCallback(async () => {
    let hashes = accounts.map(({ hash }) => hash)
    if (!hashes.every(Boolean)) {
      setAlert('Invalid private key')
      return
    }
    if (
      new Set(hashes.concat(existingGroupWallet?.hashes || [])).size !==
      hashes.length + (existingGroupWallet?.hashes.length || 0)
    ) {
      setAlert('Duplicate private key')
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
              Add accounts to an existing private-key group wallet.
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

        <Stack spacing={3}>
          {privateKeys.map((privateKey, i) => {
            return (
              <HStack key={i}>
                <Textarea
                  size="lg"
                  resize="none"
                  placeholder={
                    isUseGroupChecked
                      ? `Private Key ${
                          (existingGroupWallet?.hashes.length || 0) + i + 1
                        }`
                      : 'Private Key'
                  }
                  sx={{ WebkitTextSecurity: 'disc' }}
                  errorBorderColor="red.500"
                  isInvalid={!!privateKey && !checkPrivateKey(privateKey)}
                  value={privateKey}
                  onChange={(e) => {
                    setPrivateKeys([
                      ...privateKeys.slice(0, i),
                      e.target.value.trim(),
                      ...privateKeys.slice(i + 1)
                    ])
                  }}
                />

                {isUseGroupChecked && (
                  <IconButton
                    size="xs"
                    aria-label="Add private key"
                    icon={<AddIcon />}
                    visibility={
                      i === privateKeys.length - 1 ? 'visible' : 'hidden'
                    }
                    onClick={() => setPrivateKeys([...privateKeys, ''])}
                  />
                )}

                {isUseGroupChecked && (
                  <IconButton
                    size="xs"
                    aria-label="Remove private key"
                    icon={<MinusIcon />}
                    visibility={privateKeys.length > 1 ? 'visible' : 'hidden'}
                    onClick={() =>
                      setPrivateKeys([
                        ...privateKeys.slice(0, i),
                        ...privateKeys.slice(i + 1)
                      ])
                    }
                  />
                )}
              </HStack>
            )
          })}
        </Stack>

        {!willAddToExistingGroupChecked && (
          <NameInput
            value={name}
            onChange={setName}
            placeholder={
              isUseGroupChecked ? 'Group Name (Optional)' : undefined
            }
          />
        )}

        <AccountAbstractionChecker />

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
        walletType={WalletType.PRIVATE_KEY_GROUP}
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
