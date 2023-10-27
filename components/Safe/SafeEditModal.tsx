import {
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Select,
  Stack,
  Text,
  chakra
} from '@chakra-ui/react'
import { useState } from 'react'

import { SafeInfo } from '~lib/wallet'

export const SafeEditModal = ({
  type,
  info,
  index,
  isOpen,
  onClose
}: {
  type: 'changeThreshold' | 'changeOwner' | 'addOwner' | 'removeOwner'
  info: SafeInfo
  index?: number
  isOpen: boolean
  onClose: () => void
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="sm">
      <ModalOverlay />
      <ModalContent my={0}>
        <ModalCloseButton />
        <ModalBody p={0}>
          {type === 'changeThreshold' ? (
            <SafeEditChangeThreshold {...info} />
          ) : type === 'changeOwner' ? (
            <SafeEditChangeOwner {...info} index={index!} />
          ) : type === 'addOwner' ? (
            <SafeEditAddOwner {...info} />
          ) : (
            type === 'removeOwner' && (
              <SafeEditRemoveOwner {...info} index={index!} />
            )
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

const SafeEditChangeThreshold = ({ threshold, owners }: SafeInfo) => {
  const [_threshold, _setThreshold] = useState(threshold)

  return (
    <FormControl>
      <FormLabel>Threshold</FormLabel>
      <HStack>
        <Select
          size="lg"
          w={48}
          value={_threshold}
          onChange={(e) => _setThreshold(Number(e.target.value))}>
          {[...Array(owners.length).keys()].map((index) => {
            return (
              <option key={index} value={index + 1}>
                {index + 1}
              </option>
            )
          })}
        </Select>
        <Text>out of {owners.length} owner(s)</Text>
      </HStack>
      <FormHelperText>
        <chakra.span color="gray.500">
          Current threshold is {threshold}.
        </chakra.span>
        &nbsp;Recommend using a threshold higher than one to prevent losing
        access to the Safe account in case an owner key is lost or compromised.
      </FormHelperText>
    </FormControl>
  )
}

const SafeEditChangeOwner = ({
  owners,
  index
}: SafeInfo & {
  index: number
}) => {
  return (
    <Stack>
      <FormControl>
        <FormLabel>Change Owner</FormLabel>
        <FormHelperText>
          Review the owner you want to replace in the Safe Account, then specify
          the new owner you want to replace it with.
        </FormHelperText>
      </FormControl>
    </Stack>
  )
}

const SafeEditAddOwner = ({ threshold, owners }: SafeInfo) => {
  return <></>
}

const SafeEditRemoveOwner = ({
  threshold,
  owners,
  index
}: SafeInfo & {
  index: number
}) => {
  return <></>
}
