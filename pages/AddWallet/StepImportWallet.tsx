import { Button } from '@chakra-ui/react'
import { useWizard } from 'react-use-wizard'

export const StepImportWallet = () => {
  const { nextStep } = useWizard()

  return (
    <>
      StepImportWallet
      <Button
        h="14"
        size="lg"
        variant="outline"
        borderRadius="8px"
        onClick={nextStep}>
        Continue
      </Button>
    </>
  )
}
