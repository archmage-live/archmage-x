import {
  Button,
  Divider,
  Image,
  SimpleGrid,
  Stack,
  Text,
  useColorModeValue
} from '@chakra-ui/react'
import safeLogo from 'data-base64:~assets/thirdparty/Safe_Logos_H-Lockup_Black.svg'
import { useCallback } from 'react'
import { useWizard } from 'react-use-wizard'

import { MultisigWalletType } from '~lib/wallet'

import { useMultisigType } from '../addWallet'
import { StepMultisigSafe } from './StepMultisigSafe'

interface MultisigSchemeInfo {
  logo: string
  filter?: string
}

export const StepMultisig = () => {
  const { nextStep } = useWizard()

  const [selectedMultisigType, setSelectedMultisigType] = useMultisigType()

  const filterForDarkInvert = useColorModeValue(undefined, 'invert(100%)')

  const multisigSchemes: Map<MultisigWalletType, MultisigSchemeInfo> = new Map([
    [
      MultisigWalletType.SAFE,
      {
        logo: safeLogo,
        filter: filterForDarkInvert
      }
    ]
  ])

  const multisigTypes = [MultisigWalletType.SAFE]

  const onClick = useCallback(async () => {
    switch (selectedMultisigType) {
      case MultisigWalletType.SAFE:
        break
      default:
        return
    }

    await nextStep()
  }, [selectedMultisigType, nextStep])

  return (
    <Stack p="4" pt="16" spacing={8}>
      <Stack>
        <Text fontSize="4xl" fontWeight="bold" textAlign="center">
          Create or Import Multisig Wallet
        </Text>

        <Text fontSize="lg" color="gray.500" textAlign="center">
          Select a multisig scheme you&apos;d like to use with Archmage.
        </Text>
      </Stack>

      <Divider />

      <SimpleGrid columns={2} spacing={8}>
        {multisigTypes.map((type) => {
          const { logo, filter } = multisigSchemes.get(type)!
          return (
            <Button
              key={type}
              variant="outline"
              colorScheme={type === selectedMultisigType ? 'purple' : 'gray'}
              height="100px"
              px={8}
              onClick={() => setSelectedMultisigType(type)}>
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

      <Button
        h="14"
        size="lg"
        colorScheme="purple"
        borderRadius="8px"
        isDisabled={!selectedMultisigType}
        onClick={onClick}>
        Continue
      </Button>
    </Stack>
  )
}

export const StepMultisigPerform = () => {
  const [multisigType] = useMultisigType()
  switch (multisigType) {
    case MultisigWalletType.SAFE:
      return <StepMultisigSafe />
  }
  return <></>
}
