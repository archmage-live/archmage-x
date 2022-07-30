import { Stack, Text } from '@chakra-ui/react'
import { useWizard } from 'react-use-wizard'

export const StepConnectHardwareWallet = () => {
  const { nextStep } = useWizard()

  return (
    <Stack p="4" pt="16">
      <Text fontSize="4xl" fontWeight="bold" textAlign="center">
        Connect Ledger
      </Text>

      <Text fontSize="lg" color="gray.500" textAlign="center">
        Use your hardware wallet.
      </Text>

      <Text fontSize="lg" color="gray.500" textAlign="center">
        Not yet, but soon...
      </Text>
    </Stack>
  )
}
