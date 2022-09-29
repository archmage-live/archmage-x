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
  chakra
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { useWizard } from 'react-use-wizard'

import { AlertBox } from '~components/AlertBox'
import { NETWORK_SCOPES, NetworkKind, getNetworkKind } from '~lib/network'
import { checkAddress } from '~lib/wallet'

import { NameInput } from '../NameInput'
import {
  AddWalletKind,
  useAddWallet,
  useAddWalletKind,
  useAddresses,
  useName,
  useNetworkKind
} from '../addWallet'

export const ImportWatchAddress = () => {
  const { nextStep } = useWizard()

  const [, setAddWalletKind] = useAddWalletKind()
  const [networkKind, setNetworkKind] = useNetworkKind()
  const [addresses, setAddresses] = useAddresses()
  const [name, setName] = useName()
  useEffect(() => {
    setAddWalletKind(AddWalletKind.IMPORT_WATCH_ADDRESS)
    setNetworkKind(NetworkKind.EVM)
    setAddresses([''])
    setName('')
  }, [setAddWalletKind, setNetworkKind, setAddresses, setName])

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

  const [alert, setAlert] = useState('')
  useEffect(() => {
    setAlert('')
  }, [addresses, name])

  const addWallet = useAddWallet()

  const onImport = useCallback(async () => {
    const addrs = addresses.map((addr) => checkAddress(networkKind, addr))
    if (addrs.some((addr) => !addr)) {
      setAlert('Invalid address')
      return
    }
    if (new Set(addrs).size !== addrs.length) {
      setAlert('Duplicate address')
      return
    }

    const { error } = await addWallet()
    if (error) {
      setAlert(error)
      return
    }

    nextStep()
  }, [addresses, addWallet, nextStep, networkKind])

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

        <Checkbox
          size="lg"
          colorScheme="purple"
          isChecked={isWatchGroupChecked}
          onChange={(e) => setIsWatchGroupChecked(e.target.checked)}>
          <chakra.span color="gray.400" fontSize="xl">
            Create group to watch multiple addresses.
          </chakra.span>
        </Checkbox>

        <Stack spacing={3}>
          {addresses.map((address, i) => {
            return (
              <HStack key={i}>
                <Input
                  size="lg"
                  placeholder={
                    isWatchGroupChecked ? `Address ${i + 1}` : 'Address'
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

        <NameInput
          value={name}
          onChange={setName}
          placeholder={
            isWatchGroupChecked ? 'Group Name (Optional)' : undefined
          }
        />

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
    </Stack>
  )
}
