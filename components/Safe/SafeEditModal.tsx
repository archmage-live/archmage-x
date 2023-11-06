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

import { IChainAccount, INetwork, ISubWallet, IWallet } from '~lib/schema'
import { SafeInfo } from '~lib/wallet'

export type SafeEditType =
  | 'changeThreshold'
  | 'changeOwner'
  | 'addOwner'
  | 'removeOwner'

export const SafeEditModal = ({
  isOpen,
  onClose,
  network,
  wallet,
  subWallet,
  account,
  type,
  index
}: {
  isOpen: boolean
  onClose: () => void
  network: INetwork
  wallet: IWallet
  subWallet: ISubWallet
  account: IChainAccount
  type: SafeEditType
  index?: number
}) => {
  const info = account.info.safe || subWallet.info.safe

  if (!info) {
    return <></>
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      motionPreset="slideInBottom"
      scrollBehavior="inside"
      size="lg">
      <ModalOverlay />
      <ModalContent my={0}>
        <ModalCloseButton />
        <ModalBody p={0}>
          {isOpen &&
            (type === 'changeThreshold' ? (
              <SafeEditChangeThreshold {...info} />
            ) : type === 'changeOwner' ? (
              <SafeEditChangeOwner {...info} index={index!} />
            ) : type === 'addOwner' ? (
              <SafeEditAddOwner {...info} />
            ) : (
              type === 'removeOwner' && (
                <SafeEditRemoveOwner {...info} index={index!} />
              )
            ))}
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
