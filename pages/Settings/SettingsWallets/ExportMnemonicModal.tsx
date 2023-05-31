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
import { MnemonicRemember } from '~components/MnemonicRemember'
import { ValidatedAction } from '~components/ValidatedAction'
import { WALLET_SERVICE } from '~lib/services/wallet'

interface ExportMnemonicModalProps {
  walletId: number
  notBackedUp?: boolean
  isOpen: boolean
  onClose: () => void
  size?: ModalProps['size']
}

export const ExportMnemonicModal = ({
  walletId,
  notBackedUp,
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
      scrollBehavior="inside"
      size={size || 'lg'}>
      <ModalOverlay />
      <ModalContent>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={4}>
            <ValidatedAction onClose={onClose}>
              <ExportMnemonic
                walletId={walletId}
                notBackedUp={notBackedUp}
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

const ExportMnemonic = ({
  walletId,
  notBackedUp,
  onClose
}: ExportMnemonicModalProps) => {
  const [mnemonic, setMnemonic] = useState<string[]>([])
  useEffect(() => {
    // TODO
    WALLET_SERVICE.getKeystore(walletId).then((keystore) => {
      if (keystore?.mnemonic) {
        setMnemonic(keystore.mnemonic.phrase.split(' '))
      }
    })
  }, [walletId])

  const [inConfirm, setInConfirm] = useState(false)
  const [remembered, setRemembered] = useState(false)

  return (
    <Stack px="4" py="12" spacing="12">
      <Stack>
        <HStack justify="center">
          <Text fontSize="2xl" fontWeight="bold">
            {!notBackedUp
              ? 'Do not share your secret phrase!'
              : 'Back up your secret phrase'}
          </Text>
        </HStack>
        <HStack justify="center">
          <Text fontSize="lg" color="gray.500">
            {!notBackedUp
              ? 'If someone has your secret phrase, they will have full control of your wallet.'
              : !inConfirm
              ? 'This phrase is the ONLY way to recover your wallet. Do NOT share it with anyone!'
              : 'Please confirm your secret recovery phrase.'}
          </Text>
        </HStack>
      </Stack>

      {!inConfirm ? (
        <MnemonicDisplay mnemonic={mnemonic} />
      ) : (
        <MnemonicRemember mnemonic={mnemonic} setRemembered={setRemembered} />
      )}

      {!inConfirm ? (
        <Button
          variant="outline"
          colorScheme="purple"
          onClick={() => {
            if (!notBackedUp) {
              onClose()
              setMnemonic([])
            } else {
              setInConfirm(true)
            }
          }}>
          {!notBackedUp ? 'Done' : 'Continue'}
        </Button>
      ) : (
        <HStack spacing={8}>
          <Button
            flex={1}
            variant="outline"
            colorScheme="purple"
            onClick={() => {
              setInConfirm(false)
            }}>
            Back
          </Button>

          <Button
            flex={1}
            colorScheme="purple"
            isDisabled={!remembered}
            onClick={async () => {
              await WALLET_SERVICE.backUpWallet(walletId)
              onClose()
              setMnemonic([])
            }}>
            Done
          </Button>
        </HStack>
      )}
    </Stack>
  )
}
