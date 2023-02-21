import {
  Button,
  Divider,
  FormControl,
  FormLabel,
  Image,
  Select,
  SimpleGrid,
  Stack,
  Text,
  useColorModeValue
} from '@chakra-ui/react'
import ledgerLogo from 'data-base64:~assets/thirdparty/ledger-horizontal.svg'
import { useCallback, useEffect, useState } from 'react'
import { useWizard } from 'react-use-wizard'

import { AlertBox } from '~components/AlertBox'
import { clearLedgerTransport, getLedgerTransport } from '~lib/hardware/ledger'
import { HardwareWalletType } from '~lib/wallet'

import {
  HardwareWalletTransports,
  useHwTransport,
  useHwType
} from '../addWallet'
import { StepConnectLedger } from './StepConnectLedger'

interface HardwareWalletInfo {
  logo: string
  filter?: string
  transports: Map<
    string | undefined,
    {
      title: string
      description: string
    }
  >
}

export const StepConnectHardwareWallet = () => {
  const { nextStep } = useWizard()

  const filterForDarkInvert = useColorModeValue(undefined, 'invert(100%)')
  // const filterForLightInvert = useColorModeValue('invert(100%)', undefined)

  const hardwareWallets: Map<HardwareWalletType, HardwareWalletInfo> = new Map([
    [
      HardwareWalletType.LEDGER,
      {
        logo: ledgerLogo,
        filter: filterForDarkInvert,
        transports: new Map([
          [
            'hid',
            {
              title: 'Plug in Ledger wallet',
              description:
                'Connect your Ledger wallet directly to your computer. Unlock your Ledger.'
            }
          ],
          [
            'ble',
            {
              title: 'Bluetooth connection with Ledger wallet',
              description:
                'Make sure Bluetooth is enabled and pair your Ledger Nano X or Ledger Stax the first time you set it up with your computer. Unlock your Ledger.'
            }
          ]
        ])
      }
    ]
  ])

  const hwTypes = [HardwareWalletType.LEDGER]

  const [selectedHwType, setSelectedHwType] = useHwType()
  const [hwTransport, setHwTransport] = useHwTransport()

  const [connectError, setConnectError] = useState('')

  useEffect(() => {
    if (selectedHwType === HardwareWalletType.LEDGER) {
      setHwTransport('hid')
    } else {
      setHwTransport(undefined)
    }
    setConnectError('')
  }, [selectedHwType, setHwTransport])

  const connectLedger = useCallback(async () => {
    if (hwTransport) {
      try {
        await getLedgerTransport(hwTransport)
      } catch (err) {
        clearLedgerTransport(hwTransport)
        throw err
      }
    }
  }, [hwTransport])

  const [isLoading, setIsLoading] = useState(false)

  const onClick = useCallback(async () => {
    setConnectError('')
    setIsLoading(true)

    try {
      switch (selectedHwType) {
        case HardwareWalletType.LEDGER:
          await connectLedger()
          break
        default:
          setIsLoading(false)
          return
      }

      await nextStep()
    } catch (err: any) {
      setConnectError(err.toString())
    } finally {
      setIsLoading(false)
    }
  }, [selectedHwType, connectLedger, nextStep])

  return (
    <Stack p="4" pt="16" spacing={8}>
      <Stack>
        <Text fontSize="4xl" fontWeight="bold" textAlign="center">
          Connect Hardware Wallet
        </Text>

        <Text fontSize="lg" color="gray.500" textAlign="center">
          Select a hardware wallet you&apos;d like to use with Archmage.
        </Text>
      </Stack>

      <Divider />

      <SimpleGrid columns={2} spacing={8}>
        {hwTypes.map((type) => {
          const { logo, filter } = hardwareWallets.get(type)!
          return (
            <Button
              key={type}
              variant="outline"
              colorScheme={type === selectedHwType ? 'purple' : 'gray'}
              height="100px"
              px={8}
              onClick={() => setSelectedHwType(type)}>
              <Image
                objectFit="cover"
                filter={filter}
                src={logo}
                alt={type + ' Logo'}
              />
            </Button>
          )
        })}
      </SimpleGrid>

      {selectedHwType && (
        <Stack spacing={4}>
          {hwTransport && (
            <FormControl>
              <FormLabel fontSize="lg">Transport</FormLabel>
              <Select
                value={hwTransport}
                onChange={(e) => setHwTransport(e.target.value as any)}>
                {HardwareWalletTransports.map(([transport, title]) => {
                  return (
                    <option key={transport} value={transport}>
                      {title}
                    </option>
                  )
                })}
              </Select>
            </FormControl>
          )}

          <Stack>
            <Text fontSize="lg" fontWeight="medium">
              {
                hardwareWallets.get(selectedHwType)!.transports.get(hwTransport)
                  ?.title
              }
            </Text>
            <Text fontSize="lg" color="gray.500">
              {
                hardwareWallets.get(selectedHwType)!.transports.get(hwTransport)
                  ?.description
              }
            </Text>
          </Stack>
        </Stack>
      )}

      <AlertBox>{connectError}</AlertBox>

      <Button
        h="14"
        size="lg"
        colorScheme="purple"
        borderRadius="8px"
        isDisabled={!selectedHwType}
        isLoading={isLoading}
        onClick={onClick}>
        Continue
      </Button>
    </Stack>
  )
}

export const StepConnectHardwareWalletAccounts = () => {
  const [hwType] = useHwType()
  switch (hwType) {
    case HardwareWalletType.LEDGER:
      return <StepConnectLedger />
  }
  return <></>
}
