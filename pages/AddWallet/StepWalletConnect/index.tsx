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
import { PSEUDO_INDEX } from '~lib/schema'
import { NETWORK_SERVICE } from '~lib/services/network'
import { checkAddress } from '~lib/wallet'
import { useWalletConnect } from '~lib/walletConnect'

import { NameInput } from '../NameInput'
import {
  AddWalletKind,
  useAccounts,
  useAddWallet,
  useAddWalletKind,
  useName,
  useNetworkKind
} from '../addWallet'

export const StepWalletConnect = () => {
  const { nextStep } = useWizard()

  const [, setAddWalletKind] = useAddWalletKind()
  const [networkKind, setNetworkKind] = useNetworkKind()
  const [accounts, setAccounts] = useAccounts()
  const [name, setName] = useName()
  useEffect(() => {
    setAddWalletKind(AddWalletKind.WALLET_CONNECT)
    setNetworkKind(NetworkKind.EVM)
    setAccounts([])
    setName('')
  }, [setAddWalletKind, setNetworkKind, setAccounts, setName])

  const [isGroupChecked, setIsGroupChecked] = useState(false)
  useEffect(() => {
    if (!isGroupChecked) {
      setAccounts((accounts) => accounts.slice(0, 1))
    }
    setAddWalletKind(
      !isGroupChecked
        ? AddWalletKind.WALLET_CONNECT
        : AddWalletKind.WALLET_CONNECT_GROUP
    )
  }, [isGroupChecked, setAddWalletKind, setAccounts])

  const [alert, setAlert] = useState('')
  useEffect(() => {
    setAlert('')
  }, [accounts, name])

  const addWallet = useAddWallet()

  const onImport = useCallback(async () => {
    const addrs = accounts.map(({ address }) =>
      checkAddress(networkKind, address!)
    )
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

    await nextStep()
  }, [accounts, addWallet, nextStep, networkKind])

  // WalletConnect 1.0 only supports Ethereum networks
  // Here we only connect it with Ethereum mainnet
  const { value: network } = useAsync(async () => {
    return await NETWORK_SERVICE.getNetwork({
      kind: NetworkKind.EVM,
      chainId: 1 // Ethereum mainnet
    })
  }, [])

  const [url, setUrl] = useState('')

  const { addresses, refresh } = useWalletConnect(network, setUrl)

  useEffect(() => {
    if (!addresses?.length) {
      return
    }
    setAccounts((accounts) => {
      let accs = accounts.slice()
      if (isGroupChecked) {
        let update = false
        const existing = new Set(accs.map((c) => c.address!))
        for (const address of addresses) {
          if (!existing.has(address)) {
            accs.push({
              index: accs.length,
              hash: address,
              address
            })
            update = true
          }
        }
        if (!update) {
          return accounts
        }
      } else {
        if (accounts[0].address === addresses[0]) {
          return accounts
        }
        accs = [
          { index: PSEUDO_INDEX, hash: addresses[0], address: addresses[0] }
        ]
      }
      refresh()
      return accs
    })
  }, [addresses, refresh, setAccounts, isGroupChecked])

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
            {accounts.map(({ address }, i) => {
              return (
                <HStack key={i}>
                  <Input size="lg" value={address} readOnly />

                  {isGroupChecked && (
                    <IconButton
                      size="xs"
                      aria-label="Remove address"
                      icon={<MinusIcon />}
                      visibility={accounts.length > 1 ? 'visible' : 'hidden'}
                      onClick={() =>
                        setAccounts([
                          ...accounts.slice(0, i),
                          ...accounts.slice(i + 1)
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
        isDisabled={
          !accounts.length || accounts.some(({ address }) => !address)
        }
        onClick={onImport}>
        Connect
      </Button>
    </Stack>
  )
}
