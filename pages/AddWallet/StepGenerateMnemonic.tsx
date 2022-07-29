import { ViewOffIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  ButtonGroup,
  Center,
  Checkbox,
  Container,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Stack,
  Text,
  chakra,
  useClipboard,
  useDisclosure
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { FiCheckCircle, FiCopy } from 'react-icons/fi'
import { useWizard } from 'react-use-wizard'

import { WALLET_SERVICE } from '~lib/services/walletService'

import { useMnemonic } from './state'

export const StepGenerateMnemonic = () => {
  const { nextStep } = useWizard()

  const [mnemonic, setMnemonic] = useMnemonic()
  const [isChecked, setIsChecked] = useState(false)

  useEffect(() => {
    if (!mnemonic) {
      setMnemonic(WALLET_SERVICE.generateMnemonic().split(' '))
    }
  }, [mnemonic, setMnemonic])

  const {
    isOpen: isCopyOpen,
    onOpen: onCopyOpen,
    onClose: onCopyClose
  } = useDisclosure()
  const [isCopyChecked, setIsCopyChecked] = useState(false)

  useEffect(() => {
    setIsCopyChecked(false)
  }, [isCopyOpen])

  return (
    <Stack p="4" pt="16" spacing="12">
      <Stack>
        <Text fontSize="4xl" fontWeight="bold" textAlign="center">
          Secret Recovery Phrase
        </Text>
        <Text
          fontSize="lg"
          fontWeight="bold"
          color="gray.500"
          textAlign="center">
          This phrase is the ONLY way to recover your wallet. Do NOT share it
          with anyone!
        </Text>
      </Stack>

      <Stack spacing={4}>
        <Box position="relative" role="group">
          <Center
            position="absolute"
            w="full"
            h="full"
            zIndex={1}
            _groupHover={{ visibility: 'hidden' }}>
            <ViewOffIcon fontSize="6xl" />
          </Center>
          <SimpleGrid
            columns={3}
            gap={4}
            filter="auto"
            blur="4px"
            _groupHover={{ blur: '0' }}
            transition="filter 0.2s">
            {mnemonic?.map((word, index) => {
              return <WordBox key={index} index={index} word={word} />
            })}
          </SimpleGrid>
        </Box>

        <HStack justify="end">
          <Button
            variant="outline"
            size="xs"
            color="gray.500"
            onClick={onCopyOpen}>
            Copy
          </Button>
          <Button variant="outline" size="xs" color="gray.500">
            Download
          </Button>
        </HStack>
      </Stack>

      <Checkbox
        size="lg"
        colorScheme="purple"
        isChecked={isChecked}
        onChange={(e) => setIsChecked(e.target.checked)}>
        <chakra.span color="gray.400" fontSize="xl">
          I saved my Secret Recovery Phrase
        </chakra.span>
      </Checkbox>

      <Button
        h="14"
        size="lg"
        variant="outline"
        borderRadius="8px"
        disabled={!isChecked}
        onClick={nextStep}>
        Continue
      </Button>

      <Modal
        isOpen={isCopyOpen}
        onClose={onCopyClose}
        isCentered
        motionPreset="slideInBottom">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Copy Mnemonic</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              <Text color="yellow.400" fontWeight="bold">
                Warning: You should never copy and paste your mnemonic. If you
                must do this, be aware of the possibility of losing assets.
              </Text>

              <Checkbox
                size="lg"
                colorScheme="purple"
                isChecked={isCopyChecked}
                onChange={(e) => setIsCopyChecked(e.target.checked)}>
                <chakra.span color="gray.400" fontSize="xl">
                  I know all the risks
                </chakra.span>
              </Checkbox>
            </Stack>
          </ModalBody>

          <ModalFooter>
            <ButtonGroup>
              <CopyMnemonicButton
                mnemonic={mnemonic?.join(' ')}
                disabled={!isCopyChecked}
              />
              <Button colorScheme="purple" mr={3} onClick={onCopyClose}>
                Close
              </Button>
            </ButtonGroup>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  )
}

const WordBox = ({ index, word }: { index: number; word: string }) => {
  return (
    <Box
      py="2"
      px="4"
      borderRadius="8px"
      border="1px solid"
      borderColor="gray.700"
      bg="blackAlpha.400">
      <chakra.span color="gray.500" userSelect="none">
        {index + 1}.&nbsp;
      </chakra.span>
      <span>{word}</span>
    </Box>
  )
}

export const CopyMnemonicButton = ({
  mnemonic,
  disabled
}: {
  mnemonic?: string
  disabled: boolean
}) => {
  const { hasCopied, onCopy } = useClipboard(mnemonic ?? '')
  return !hasCopied ? (
    <Button
      variant="outline"
      leftIcon={<FiCopy />}
      onClick={onCopy}
      disabled={disabled}>
      Copy Mnemonic
    </Button>
  ) : (
    <Button variant="outline" leftIcon={<FiCheckCircle />}>
      Copied
    </Button>
  )
}
