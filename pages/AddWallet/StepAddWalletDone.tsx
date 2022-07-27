import { Button } from '@chakra-ui/react'

export const StepAddWalletDone = () => {
  return (
    <>
      StepAddWalletDone
      <Button
        h="14"
        size="lg"
        variant="outline"
        borderRadius="8px"
        onClick={() => window.close()}>
        Continue
      </Button>
    </>
  )
}
