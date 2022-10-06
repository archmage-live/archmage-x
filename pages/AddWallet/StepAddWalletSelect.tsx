import { Button, HStack, Stack, Text } from '@chakra-ui/react'
import { useEffect } from 'react'
import { useWizard } from 'react-use-wizard'

import { AddWalletKind, useAddWalletKind, useClear } from './addWallet'

export const StepAddWalletSelect = () => {
  const { nextStep } = useWizard()
  const [, setAddWalletKind] = useAddWalletKind()

  const clear = useClear()
  useEffect(clear, [])

  return (
    <Stack p="4" pt="16">
      <HStack justify="center">
        <Text fontSize="4xl" fontWeight="bold">
          Archmage
        </Text>
      </HStack>
      <HStack justify="center">
        <Text fontSize="lg" fontWeight="bold" color="gray.500">
          Programmable Web3 wallet
        </Text>
      </HStack>

      <Stack pt="8" spacing="4">
        <Button
          w="full"
          h="14"
          size="lg"
          variant="outline"
          borderRadius="8px"
          onClick={() => {
            setAddWalletKind(AddWalletKind.NEW_HD)
            nextStep()
          }}>
          Create new wallet
        </Button>
        <Button
          w="full"
          h="14"
          size="lg"
          variant="outline"
          borderRadius="8px"
          onClick={() => {
            setAddWalletKind(AddWalletKind.IMPORT_HD)
            nextStep()
          }}>
          Import existing wallet
        </Button>
        <Button
          w="full"
          h="14"
          size="lg"
          variant="outline"
          borderRadius="8px"
          onClick={() => {
            setAddWalletKind(AddWalletKind.CONNECT_HARDWARE)
            nextStep()
          }}>
          Connect hardware wallet
        </Button>
      </Stack>

      <Stack pt="8" spacing="0" align="center">
        <Text color="gray.500">
          All sensitive information is stored only on your device.
        </Text>
        <Text color="gray.500">
          This process will never require an internet connection.
        </Text>
      </Stack>
    </Stack>
  )
}
