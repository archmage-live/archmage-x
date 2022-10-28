import {
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormLabel,
  Select,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  chakra,
  useColorModeValue
} from '@chakra-ui/react'
import { QRCodeSVG } from 'qrcode.react'
import * as React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { useWizard } from 'react-use-wizard'

import { AlertBox } from '~components/AlertBox'
import { CopyArea } from '~components/CopyIcon'
import { NETWORK_SCOPES, NetworkKind, getNetworkKind } from '~lib/network'
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
        ? AddWalletKind.WALLET_CONNECT
        : AddWalletKind.WALLET_CONNECT_GROUP
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

  useWalletConnect()

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
          <WallectConnectQRCode url={''} />

          <Checkbox
            size="lg"
            colorScheme="purple"
            isChecked={isWatchGroupChecked}
            onChange={(e) => setIsWatchGroupChecked(e.target.checked)}>
            <chakra.span color="gray.500" fontSize="xl">
              Create group to connect multiple addresses.
            </chakra.span>
          </Checkbox>

          <NameInput
            value={name}
            onChange={setName}
            placeholder={
              isWatchGroupChecked ? 'Group Name (Optional)' : undefined
            }
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

const WallectConnectQRCode = ({ url }: { url: string }) => {
  const [tabIndex, setTabIndex] = useState(0)

  const qrCodeBg = useColorModeValue('white', 'black')
  const qrCodeFg = useColorModeValue('black', 'white')

  return (
    <Stack spacing={6}>
      <Tabs
        align="center"
        variant="unstyled"
        index={tabIndex}
        onChange={setTabIndex}>
        <TabList justifyContent="center">
          <Tab _selected={{ color: 'white', bg: 'blue.500' }}>QR Code</Tab>
          <Tab _selected={{ color: 'white', bg: 'blue.500' }}>URL</Tab>
        </TabList>
      </Tabs>

      <Tabs align="center" index={tabIndex}>
        <TabPanels justifyContent="center">
          <TabPanel p={0}>
            <QRCodeSVG
              value={url}
              size={200}
              bgColor={qrCodeBg}
              fgColor={qrCodeFg}
              level={'L'}
              includeMargin={false}
            />
          </TabPanel>
          <TabPanel p={0}>
            <CopyArea name="URL" copy={url} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Stack>
  )
}
