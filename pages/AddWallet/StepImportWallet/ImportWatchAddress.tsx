import { AddIcon, MinusIcon } from '@chakra-ui/icons'
import {
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Select,
  Stack,
  chakra,
  useDisclosure
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { useWizard } from 'react-use-wizard'

import { AlertBox } from '~components/AlertBox'
import { NETWORK_SCOPES, NetworkKind, getNetworkKind } from '~lib/network'
import { PSEUDO_INDEX, formatAddressForAux } from '~lib/schema'
import {
  ExistingGroupWallet,
  useNextSubWalletIndex
} from '~lib/services/wallet'
import { WalletType, checkAddress } from '~lib/wallet'

import { NameInput } from '../NameInput'
import { SelectExistingWallet, WalletItemButton } from '../SelectExistingWallet'
import {
  AddWalletKind,
  useAccounts,
  useAddSubWallets,
  useAddWallet,
  useAddWalletKind,
  useExistingWallet,
  useName,
  useNetworkKind
} from '../addWallet'

export const ImportWatchAddress = () => {
  const { nextStep } = useWizard()

  const [, setAddWalletKind] = useAddWalletKind()
  const [, setExistingWallet] = useExistingWallet()
  const [existingGroupWallet, setExistingGroupWallet] = useState<
    ExistingGroupWallet | undefined
  >(undefined)
  const [networkKind, setNetworkKind] = useNetworkKind()
  const [addresses, setAddresses] = useState<string[]>([])
  const [accounts, setAccounts] = useAccounts()
  const [name, setName] = useName()
  useEffect(() => {
    setAddWalletKind(AddWalletKind.IMPORT_WATCH_ADDRESS)
    setNetworkKind(NetworkKind.EVM)
    setAddresses([''])
    setName('')
  }, [setAddWalletKind, setNetworkKind, setAddresses, setName])

  const [
    willAddToExistingWatchGroupChecked,
    setWillAddToExistingWatchGroupChecked
  ] = useState(false)
  useEffect(() => {
    setWillAddToExistingWatchGroupChecked(false)
    setExistingGroupWallet(undefined)
  }, [networkKind, setExistingGroupWallet])
  useEffect(() => {
    setExistingWallet(existingGroupWallet?.wallet)
  }, [setExistingWallet, existingGroupWallet])

  const [isWatchGroupChecked, setIsWatchGroupChecked] = useState(false)
  useEffect(() => {
    if (!isWatchGroupChecked) {
      setAddresses((addresses) => [addresses[0]])
    }
    setAddWalletKind(
      !isWatchGroupChecked
        ? AddWalletKind.IMPORT_WATCH_ADDRESS
        : AddWalletKind.IMPORT_WATCH_ADDRESS_GROUP
    )
  }, [isWatchGroupChecked, setAddWalletKind, setAddresses])

  useEffect(() => {
    setIsWatchGroupChecked(willAddToExistingWatchGroupChecked)
  }, [willAddToExistingWatchGroupChecked])

  const [alert, setAlert] = useState('')
  useEffect(() => {
    setAlert('')
  }, [addresses, name])

  const addWallet = useAddWallet()
  const addSubWallets = useAddSubWallets()

  const nextIndex = useNextSubWalletIndex(existingGroupWallet?.wallet.id)

  useEffect(() => {
    if (isWatchGroupChecked && nextIndex === undefined) {
      return
    }
    setAccounts(
      addresses.map((addr, i) => ({
        address: addr as string,
        index: isWatchGroupChecked ? nextIndex! + i : PSEUDO_INDEX
      }))
    )
  }, [
    addresses,
    existingGroupWallet,
    isWatchGroupChecked,
    setAccounts,
    nextIndex
  ])

  const onImport = useCallback(async () => {
    let addrs = accounts.map((a) => checkAddress(networkKind, a.address!))
    if (addrs.some((addr) => !addr)) {
      setAlert('Invalid address')
      return
    }
    addrs = addrs.map((addr) =>
      formatAddressForAux(addr as string, networkKind)
    )
    if (
      new Set(addrs.concat(existingGroupWallet?.addresses || [])).size !==
      addrs.length + (existingGroupWallet?.addresses.length || 0)
    ) {
      setAlert('Duplicate address')
      return
    }

    if (!willAddToExistingWatchGroupChecked) {
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
    willAddToExistingWatchGroupChecked,
    nextStep,
    networkKind,
    addWallet,
    addSubWallets
  ])

  const {
    isOpen: isSelectOpen,
    onOpen: onSelectOpen,
    onClose: onSelectClose
  } = useDisclosure()

  return (
    <Stack spacing={12}>
      <Stack spacing={8}>
        <FormControl>
          <FormLabel>Network Kind</FormLabel>
          <Select
            w={48}
            value={networkKind}
            onChange={(e) => setNetworkKind(e.target.value as any)}>
            {NETWORK_SCOPES.map((scope) => {
              return (
                <option key={scope} value={getNetworkKind(scope)}>
                  {scope}
                </option>
              )
            })}
          </Select>
        </FormControl>

        <Stack>
          <Checkbox
            size="lg"
            colorScheme="purple"
            isChecked={willAddToExistingWatchGroupChecked}
            onChange={(e) => {
              if (e.target.checked) {
                onSelectOpen()
              } else {
                setWillAddToExistingWatchGroupChecked(false)
                setExistingGroupWallet(undefined)
              }
            }}>
            <chakra.span color="gray.500" fontSize="xl">
              Add addresses to an existing watch group wallet.
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

        {!willAddToExistingWatchGroupChecked && (
          <Checkbox
            size="lg"
            colorScheme="purple"
            isChecked={isWatchGroupChecked}
            onChange={(e) => setIsWatchGroupChecked(e.target.checked)}>
            <chakra.span color="gray.500" fontSize="xl">
              Create group to watch multiple addresses.
            </chakra.span>
          </Checkbox>
        )}

        <Stack spacing={3}>
          {addresses.map((address, i) => {
            return (
              <HStack key={i}>
                <Input
                  size="lg"
                  placeholder={
                    isWatchGroupChecked
                      ? `Address ${
                          (existingGroupWallet?.addresses.length || 0) + i + 1
                        }`
                      : 'Address'
                  }
                  errorBorderColor="red.500"
                  isInvalid={!!address && !checkAddress(networkKind, address)}
                  value={address}
                  onChange={(e) => {
                    setAddresses([
                      ...addresses.slice(0, i),
                      e.target.value.trim(),
                      ...addresses.slice(i + 1)
                    ])
                  }}
                />

                {isWatchGroupChecked && (
                  <IconButton
                    size="xs"
                    aria-label="Add address"
                    icon={<AddIcon />}
                    visibility={
                      i === addresses.length - 1 ? 'visible' : 'hidden'
                    }
                    onClick={() => setAddresses([...addresses, ''])}
                  />
                )}

                {isWatchGroupChecked && (
                  <IconButton
                    size="xs"
                    aria-label="Remove address"
                    icon={<MinusIcon />}
                    visibility={addresses.length > 1 ? 'visible' : 'hidden'}
                    onClick={() =>
                      setAddresses([
                        ...addresses.slice(0, i),
                        ...addresses.slice(i + 1)
                      ])
                    }
                  />
                )}
              </HStack>
            )
          })}
        </Stack>

        {!willAddToExistingWatchGroupChecked && (
          <NameInput
            value={name}
            onChange={setName}
            placeholder={
              isWatchGroupChecked ? 'Group Name (Optional)' : undefined
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
        disabled={!addresses.length || addresses.some((addr) => !addr)}
        onClick={onImport}>
        Import Wallet
      </Button>

      <SelectExistingWallet
        networkKind={networkKind}
        walletType={WalletType.WATCH_GROUP}
        selected={existingGroupWallet}
        onSelected={(w) => {
          setWillAddToExistingWatchGroupChecked(true)
          setExistingGroupWallet(w)
        }}
        isOpen={isSelectOpen}
        onClose={onSelectClose}
      />
    </Stack>
  )
}
