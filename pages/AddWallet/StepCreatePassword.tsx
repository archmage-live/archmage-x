import { Button, Container, HStack, Input, Stack, Text } from '@chakra-ui/react'
import { useWizard } from 'react-use-wizard'

export const StepCreatePassword = () => {
  const { nextStep } = useWizard()

  const createPassword = () => {
    nextStep()
  }

  return (
    <Stack p="4" pt="16" spacing="12">
      <Stack>
        <HStack justify="center">
          <Text fontSize="4xl" fontWeight="bold">
            Create Password
          </Text>
        </HStack>
        <HStack justify="center">
          <Text fontSize="lg" color="gray.500">
            You will use this to unlock your wallets on this device.
          </Text>
        </HStack>
      </Stack>

      <Input type="password" size="lg" placeholder="Password" />
      <Input type="password" size="lg" placeholder="Confirm Password" />

      <Button
        h="14"
        size="lg"
        variant="outline"
        borderRadius="8px"
        onClick={createPassword}>
        Continue
      </Button>
    </Stack>
  )
}
