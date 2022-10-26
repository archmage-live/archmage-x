import {
  Button,
  Divider,
  Image,
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

import { useHwType } from '../addWallet'
import { StepConnectLedger } from './StepConnectLedger'

interface HardwareWalletInfo {
  logo: string
  filter?: string
  title: string
  description: string
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
        title: 'Plug in Ledger wallet',
        description:
          'Connect your Ledger wallet directly to your computer. Unlock your Ledger and open the Ethereum app.'
      }
    ]
  ])

  const hwTypes = [HardwareWalletType.LEDGER]

  const [selectedHwType, setSelectedHwType] = useHwType()

  const [connectError, setConnectError] = useState('')

  useEffect(() => {
    setConnectError('')
  }, [selectedHwType])

  const connectLedger = useCallback(async () => {
    try {
      await getLedgerTransport('hid')
    } catch (err) {
      clearLedgerTransport('hid')
      throw err
    }
  }, [])

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
        <Stack>
          <Text fontSize="lg" fontWeight="medium">
            {hardwareWallets.get(selectedHwType)!.title}
          </Text>
          <Text fontSize="lg" color="gray.500">
            {hardwareWallets.get(selectedHwType)!.description}
          </Text>
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
