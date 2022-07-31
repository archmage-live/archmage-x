import { Button, Stack, Text } from '@chakra-ui/react'
import { useWizard } from 'react-use-wizard'

import { useClear, useCreated } from './addWallet'

export const StepAddWalletDone = () => {
  const { goToStep } = useWizard()

  const [created] = useCreated()
  const clear = useClear()

  return (
    <Stack p="4" pt="16" spacing="12">
      <Stack>
        <Text fontSize="4xl" fontWeight="bold" textAlign="center">
          {!created ? (
            <>Wallet is being saved...</>
          ) : (
            <>Wallet saved successfully!</>
          )}
        </Text>
        <Text fontSize="lg" color="gray.500" textAlign="center">
          You can check your new wallet by clicking the Archmage X extension.
        </Text>
      </Stack>

      <Stack>
        <Button
          h="14"
          size="lg"
          colorScheme="purple"
          borderRadius="8px"
          isLoading={!created}
          loadingText="Saving..."
          onClick={() => {
            clear()
            window.close()
          }}>
          Done
        </Button>
        <Button
          h="14"
          size="lg"
          variant="outline"
          borderRadius="8px"
          disabled={!created}
          onClick={() => {
            clear()
            goToStep(0)
          }}>
          Add another wallet
        </Button>
      </Stack>
    </Stack>
  )
}
