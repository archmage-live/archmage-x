import {
  Button,
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
import { useState } from 'react'

import { AlertBox } from '~components/AlertBox'
import { getActiveNetwork, getActiveWallet } from '~lib/active'
import { INetwork } from '~lib/schema'
import { NETWORK_SERVICE, getNetworkInfo } from '~lib/services/network'
import { WALLET_SERVICE } from '~lib/services/wallet'

interface DeleteNetworkModalProps {
  network?: INetwork
  isOpen: boolean
  onClose: () => void
  onDelete?: () => void
}

export const DeleteNetworkModal = ({
  network,
  isOpen,
  onClose,
  onDelete
}: DeleteNetworkModalProps) => {
  const [isLoading, setIsLoading] = useState(false)

  if (!network) {
    return <></>
  }

  const info = getNetworkInfo(network)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      motionPreset="slideInBottom"
      scrollBehavior="inside"
      size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader textAlign="center">Delete network?</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack pb={8} spacing={8}>
            <Stack
              spacing={0}
              py="2"
              px="4"
              borderRadius="4px"
              borderWidth="1px"
              borderColor="gray.500"
              align="center">
              <HStack>
                <Stack maxW={64} spacing={0} align="center">
                  <Text noOfLines={2} fontSize="lg" fontWeight="medium">
                    {info.name}
                  </Text>
                </Stack>
              </HStack>
            </Stack>

            <AlertBox>This network will be removed from Archmage.</AlertBox>

            <HStack>
              <Button
                variant="outline"
                colorScheme="purple"
                flex={1}
                isDisabled={isLoading}
                onClick={onClose}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                flex={1}
                isLoading={isLoading}
                onClick={async () => {
                  setIsLoading(true)
                  await NETWORK_SERVICE.deleteNetwork(network.id)
                  await getActiveNetwork()
                  setIsLoading(false)
                  onClose()
                  onDelete?.()
                }}>
                Delete
              </Button>
            </HStack>
          </Stack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
