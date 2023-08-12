import { ChevronLeftIcon } from '@chakra-ui/icons'
import {
  Box,
  BoxProps,
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
  skipFirstStepHeader?: boolean
  hideLastStepBackButton?: boolean
  children: React.ReactNode
}

export const ActionWizard = ({
  skipFirstStepHeader,
  hideLastStepBackButton,
  children,
  ...props
}: ActionWizardProps) => {
  return (
    <Card w="40rem" {...props}>
      <Wizard
        startIndex={0}
        header={
          <ActionWizardHeader
            skipFirstStepHeader={skipFirstStepHeader}
            hideLastStepBackButton={hideLastStepBackButton}
          />
        }>
        {React.Children.toArray(children).filter(Boolean)}
      </Wizard>
    </Card>
  )
}

const ActionWizardHeader = ({
  skipFirstStepHeader,
  hideLastStepBackButton
}: {
  skipFirstStepHeader?: boolean
  hideLastStepBackButton?: boolean
}) => {
  const { isLastStep, isFirstStep, activeStep, stepCount, previousStep } =
    useWizard()

  if (skipFirstStepHeader && isFirstStep) {
    return <></>
  }

  return (
    <Stack>
      <HStack justify="space-between">
        <IconButton
          visibility={
            isFirstStep || (isLastStep && hideLastStepBackButton)
              ? 'hidden'
              : 'visible'
          }
          icon={<ChevronLeftIcon />}
          aria-label="Previous step"
          variant="ghost"
          colorScheme="purple"
          borderRadius="50%"
          fontSize="lg"
          onClick={previousStep}
        />
        <HStack spacing="4">
          {[...Array(stepCount - (skipFirstStepHeader ? 1 : 0)).keys()].map(
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
