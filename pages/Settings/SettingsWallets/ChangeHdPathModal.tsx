import {
  Button,
  Divider,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text
} from '@chakra-ui/react'

import { AlertBox } from '~components/AlertBox'
import { HdPathInput } from '~components/HdPathInput'
import { NetworkKind, getNetworkScope } from '~lib/network'
import { IWallet } from '~lib/schema'
import { useHdPath } from '~lib/services/walletService'
import { getDefaultPath } from '~lib/wallet'

export const ChangeHdPathModal = ({
  isOpen,
  onClose,
  wallet,
  networkKind
}: {
  isOpen: boolean
  onClose: () => void
  wallet: IWallet
  networkKind: NetworkKind
}) => {
  const [hdPath] = useHdPath(networkKind, wallet, 0)
  const defaultHdPath = getDefaultPath(networkKind)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      motionPreset="slideInBottom"
      scrollBehavior="inside"
      size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader textAlign="center">Change HD Path</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <Stack spacing={12}>
            <Stack spacing={6}>
              <Divider />

              <AlertBox>
                You can set HD path for any specific network kind. Please be
                careful that changing the default HD path will cause the
                addresses of all derived accounts to change. If you want to
                change back to the original addresses and see their assets
                again, you can set back the default HD path.
              </AlertBox>

              <HStack>
                <Text>Network Kind:</Text>
                <Text color="gray.500">{getNetworkScope(networkKind)}</Text>
              </HStack>

              <HdPathInput value={hdPath} />
            </Stack>

            <HStack>
              <Button
                variant="outline"
                colorScheme="purple"
                flex={1}
                onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme="purple" flex={1}>
                Confirm
              </Button>
            </HStack>
          </Stack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
