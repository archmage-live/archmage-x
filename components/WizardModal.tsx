import { ChevronLeftIcon, CloseIcon } from '@chakra-ui/icons'
import {
  Box,
  BoxProps,
  HStack,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Stack,
  Text
} from '@chakra-ui/react'
import * as React from 'react'
import { Wizard, useWizard } from 'react-use-wizard'

interface WizardModalProps extends BoxProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  hideLastStepBackButton?: boolean
  children: React.ReactNode
}

export const WizardModal = ({
  isOpen,
  onClose,
  title,
  hideLastStepBackButton,
  children,
  ...props
}: WizardModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      motionPreset="slideInBottom"
      size="full">
      <ModalOverlay />
      <ModalContent>
        <ModalBody p={0}>
          <Box h="100vh" p={4} overflowY="auto">
            <Wizard
              startIndex={0}
              header={
                <WizardModalHeader
                  title={title}
                  onClose={onClose}
                  hideLastStepBackButton={hideLastStepBackButton}
                />
              }>
              {children}
            </Wizard>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

const WizardModalHeader = ({
  title,
  onClose,
  hideLastStepBackButton
}: {
  title?: string
  onClose: () => void
  hideLastStepBackButton?: boolean
}) => {
  const { isLastStep, isFirstStep, previousStep } = useWizard()

  return (
    <HStack h={8} justify="space-between">
      <IconButton
        visibility={
          isFirstStep || (isLastStep && hideLastStepBackButton)
            ? 'hidden'
            : 'visible'
        }
        icon={<ChevronLeftIcon />}
        aria-label="Previous step"
        variant="link"
        borderRadius="50%"
        fontSize="4xl"
        onClick={previousStep}
      />

      <Text fontSize="lg" fontWeight="medium">
        {title}
      </Text>

      <IconButton
        icon={<CloseIcon />}
        aria-label="Close modal"
        variant="link"
        borderRadius="50%"
        fontSize="lg"
        onClick={onClose}
      />
    </HStack>
  )
}
