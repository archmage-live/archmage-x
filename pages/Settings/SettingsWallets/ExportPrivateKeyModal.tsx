import { ViewOffIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Center,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  ModalProps,
  Stack,
  Text
} from '@chakra-ui/react'
import { useState } from 'react'
import { useAsync } from 'react-use'

import { CopyArea } from '~components/CopyIcon'
import { ValidatedAction } from '~components/ValidatedAction'
import { IChainAccount } from '~lib/schema'
import { getSigningWallet } from '~lib/wallet'

interface ExportPrivateKeyProps {
  account: IChainAccount
  isOpen: boolean
  onClose: () => void
  size?: ModalProps['size']
}

export const ExportPrivateKeyModal = ({
  account,
  isOpen,
  onClose,
  size
}: ExportPrivateKeyProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      motionPreset="slideInBottom"
      size={size || 'lg'}>
      <ModalOverlay />
      <ModalContent>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={4}>
            <ValidatedAction onClose={onClose}>
              <ExportPrivateKey account={account} onClose={onClose} />
            </ValidatedAction>
          </Stack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export const ExportPrivateKey = ({
  account,
  onClose
}: {
  account: IChainAccount
  onClose: () => void
}) => {
  const [privateKey, setPrivateKey] = useState('')
  useAsync(async () => {
    const signingWallet = await getSigningWallet(account)
    if (!signingWallet) {
      return
    }
    setPrivateKey(signingWallet.privateKey)
  }, [account])

  return (
    <Stack px="4" py="12" spacing="12">
      <Stack>
        <HStack justify="center">
          <Text fontSize="2xl" fontWeight="bold">
            Never disclose this key!
          </Text>
        </HStack>
        <HStack justify="center">
          <Text fontSize="lg" color="gray.500">
            Anyone with your private key can steal any assets held in your
            account.
          </Text>
        </HStack>
      </Stack>

      <Box position="relative" role="group">
        <Center
          position="absolute"
          w="full"
          h="full"
          zIndex={1}
          _groupHover={{ visibility: 'hidden' }}>
          <ViewOffIcon fontSize="6xl" />
        </Center>
        <Box
          filter="auto"
          blur="4px"
          _groupHover={{ blur: '0' }}
          transition="filter 0.2s">
          <CopyArea name="Private Key" copy={privateKey} />
        </Box>
      </Box>

      <Button
        variant="outline"
        colorScheme="purple"
        onClick={() => {
          onClose()
          setPrivateKey('')
        }}>
        Done
      </Button>
    </Stack>
  )
}
