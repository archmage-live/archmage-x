import {
  Button,
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
import { useEffect, useState } from 'react'

import { MnemonicDisplay } from '~components/MnemonicDisplay'
import { ValidatedAction } from '~components/ValidatedAction'
import { WALLET_SERVICE } from '~lib/services/walletService'

interface ExportMnemonicModalProps {
  walletId: number
  isOpen: boolean
  onClose: () => void
  size?: ModalProps['size']
}

export const ExportMnemonicModal = ({
  walletId,
  isOpen,
  onClose,
  size
}: ExportMnemonicModalProps) => {
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
              <ExportMnemonic
                walletId={walletId}
                isOpen={isOpen}
                onClose={onClose}
              />
            </ValidatedAction>
          </Stack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

const ExportMnemonic = ({ walletId, onClose }: ExportMnemonicModalProps) => {
  const [mnemonic, setMnemonic] = useState<string[]>([])
  useEffect(() => {
    WALLET_SERVICE.getKeystore(walletId).then((keystore) => {
      if (keystore?.mnemonic) {
        setMnemonic(keystore.mnemonic.phrase.split(' '))
      }
    })
  }, [walletId])

  return (
    <Stack px="4" py="12" spacing="12">
      <Stack>
        <HStack justify="center">
          <Text fontSize="2xl" fontWeight="bold">
            Do not share your secret phrase!
          </Text>
        </HStack>
        <HStack justify="center">
          <Text fontSize="lg" color="gray.500">
            If someone has your secret phrase, they will have full control of
            your wallet.
          </Text>
        </HStack>
      </Stack>

      <MnemonicDisplay mnemonic={mnemonic} />

      <Button
        variant="outline"
        colorScheme="purple"
        onClick={() => {
          onClose()
          setMnemonic([])
        }}>
        Done
      </Button>
    </Stack>
  )
}
