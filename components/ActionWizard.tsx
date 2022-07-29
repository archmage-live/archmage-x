import { ChevronLeftIcon } from '@chakra-ui/icons'
import {
  Box,
  BoxProps,
  Button,
  Center,
  Divider,
  HStack,
  IconButton,
  Stack
} from '@chakra-ui/react'
import * as React from 'react'
import { Wizard, useWizard } from 'react-use-wizard'

import { Card } from '~components/Card'

interface ActionWizardProps extends BoxProps {
  skipFirstStep?: boolean
  children: React.ReactNode
}

export const ActionWizard = ({
  skipFirstStep,
  children,
  ...props
}: ActionWizardProps) => {
  return (
    <Card w="32rem" {...props}>
      <Wizard
        startIndex={4}
        header={<ActionWizardHeader skipFirstStep={skipFirstStep} />}>
        {children}
      </Wizard>
    </Card>
  )
}

const ActionWizardHeader = ({ skipFirstStep }: { skipFirstStep?: boolean }) => {
  const {
    isLoading,
    isLastStep,
    isFirstStep,
    activeStep,
    stepCount,
    previousStep,
    nextStep,
    goToStep,
    handleStep
  } = useWizard()

  if (skipFirstStep && isFirstStep) {
    return <></>
  }

  return (
    <Stack>
      <HStack justify="space-between">
        <IconButton
          visibility={isFirstStep ? 'hidden' : 'visible'}
          icon={<ChevronLeftIcon />}
          aria-label="Previous step"
          variant="ghost"
          colorScheme="purple"
          borderRadius="50%"
          fontSize="lg"
          onClick={previousStep}
        />
        <HStack spacing="4">
          {[...Array(stepCount - (skipFirstStep ? 1 : 0)).keys()].map(
            (step) => {
              return (
                <StepCircle
                  key={step}
                  step={step}
                  active={step <= activeStep}
                />
              )
            }
          )}
        </HStack>
        <Box w="10"></Box>
      </HStack>

      <Divider />
    </Stack>
  )
}

const StepCircle = ({ step, active }: { step: number; active: boolean }) => {
  return (
    <Center
      w="4"
      h="4"
      borderRadius="50%"
      bg={active ? 'purple.500' : 'gray.500'}
      transition="background-color 0.1s">
      {/*{step + 1}*/}
    </Center>
  )
}
