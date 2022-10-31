import { MinusIcon } from '@chakra-ui/icons'
import {
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Select,
  Stack,
  Text,
  chakra
} from '@chakra-ui/react'
import * as React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { useAsync } from 'react-use'
import { useWizard } from 'react-use-wizard'

import { AlertBox } from '~components/AlertBox'
import { WallectConnectQRCode } from '~components/WalletConnectQRCode'
import { NETWORK_SCOPES, NetworkKind, getNetworkKind } from '~lib/network'
import { NETWORK_SERVICE } from '~lib/services/network'
import { checkAddress } from '~lib/wallet'
import { useWalletConnect } from '~lib/walletConnect'
import { NameInput } from '~pages/AddWallet/NameInput'
import {
  AddWalletKind,
  useAddWallet,
  useAddWalletKind,
  useAddresses,
  useName,
  useNetworkKind
} from '~pages/AddWallet/addWallet'

export const StepWalletConnect = () => {
  const { nextStep } = useWizard()

  const [, setAddWalletKind] = useAddWalletKind()
  const [networkKind, setNetworkKind] = useNetworkKind()
  const [addresses, setAddresses] = useAddresses()
  const [name, setName] = useName()
  useEffect(() => {
    setAddWalletKind(AddWalletKind.WALLET_CONNECT)
    setNetworkKind(NetworkKind.EVM)
    setAddresses([])
    setName('')
  }, [setAddWalletKind, setNetworkKind, setAddresses, setName])

  const [isGroupChecked, setIsGroupChecked] = useState(false)
  useEffect(() => {
    if (!isGroupChecked) {
      setAddresses((addresses) => addresses.slice(0, 1))
    }
    setAddWalletKind(
      !isGroupChecked
        ? AddWalletKind.WALLET_CONNECT
        : AddWalletKind.WALLET_CONNECT_GROUP
    )
  }, [isGroupChecked, setAddWalletKind, setAddresses])

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

  // WalletConnect 1.0 only supports Ethereum networks
  // Here we only connect it with Ethereum mainnet
  const { value: network } = useAsync(async () => {
    return await NETWORK_SERVICE.getNetwork({
      kind: NetworkKind.EVM,
      chainId: 1 // Ethereum mainnet
    })
  }, [])

  const [url, setUrl] = useState('')

  const { accounts, refresh } = useWalletConnect(network, setUrl)

  useEffect(() => {
    if (!accounts?.length) {
      return
    }
    setAddresses((addresses) => {
      let addrs = addresses.slice()
      if (isGroupChecked) {
        let update = false
        const existing = new Set(addrs)
        for (const addr of accounts) {
          if (!existing.has(addr)) {
            addrs.push(addr)
            update = true
          }
        }
        if (!update) {
          return addresses
        }
      } else {
        if (addresses[0] === accounts[0]) {
          return addresses
        }
        addrs = [accounts[0]]
      }
      refresh()
      return addrs
    })
  }, [accounts, refresh, setAddresses, isGroupChecked])

  return (
    <Stack p="4" pt="16" spacing={8}>
      <Stack>
        <Text fontSize="4xl" fontWeight="bold" textAlign="center">
          Connect with WalletConnect
        </Text>

        <Text fontSize="lg" color="gray.500" textAlign="center">
          Connect accounts by QR code scanning or deep linking.
        </Text>
      </Stack>

      <Divider />

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

      {networkKind === NetworkKind.EVM ? (
        <>
          <WallectConnectQRCode url={url} refresh={refresh} />

          <Checkbox
            size="lg"
            colorScheme="purple"
            isChecked={isGroupChecked}
            onChange={(e) => setIsGroupChecked(e.target.checked)}>
            <chakra.span color="gray.500" fontSize="xl">
              Create group to connect multiple addresses.
            </chakra.span>
          </Checkbox>

          <Stack spacing={3}>
            {addresses.map((address, i) => {
              return (
                <HStack key={i}>
                  <Input size="lg" value={address} readOnly />

                  {isGroupChecked && (
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
            placeholder={isGroupChecked ? 'Group Name (Optional)' : undefined}
          />

          <AlertBox>{alert}</AlertBox>
        </>
      ) : (
        <></>
      )}

      <Button
        h="14"
        size="lg"
        colorScheme="purple"
        borderRadius="8px"
        disabled={!addresses.length || addresses.some((addr) => !addr)}
        onClick={onImport}>
        Connect
      </Button>
    </Stack>
  )
}
