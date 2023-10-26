import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Stack
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { QrReader } from 'react-qr-reader'

import { AlertBox } from '~components/AlertBox'
import { ErrorBoundary } from '~components/ErrorBoundary'
import { useColor } from '~lib/hooks/useColor'

export const ScanQRModal = ({
  isOpen,
  onClose,
  onScan
}: {
  isOpen: boolean
  onClose: () => void
  onScan: (value: string) => void
}) => {
  const [alert, setAlert] = useState('')
  useEffect(() => {
    setAlert('')
  }, [])

  const borderColor = useColor('blue.500', 'blue.500')

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      returnFocusOnClose={false}
      isCentered
      motionPreset="slideInBottom"
      scrollBehavior="inside"
      size="lg">
      <ModalOverlay />
      <ModalContent maxH="100%" my={0}>
        <ModalHeader>Scan QR</ModalHeader>
        <ModalCloseButton />
        <ModalBody p={0}>
          <Stack spacing={4} px={4} pb={6} align="center">
            <ErrorBoundary fallback={<></>}>
              <QrReader
                constraints={{}}
                containerStyle={{
                  width: '300px',
                  height: '300px',
                  border: `1px solid ${borderColor.toHexString()}`
                }}
                onResult={(result, error) => {
                  if (!error) {
                    const text = result?.getText()
                    if (text) {
                      setAlert('')
                      onScan(text)
                      onClose()
                    } else {
                      setAlert('Cannot read QR code')
                    }
                  } else if (error.message) {
                    setAlert(`Cannot read QR code: ${error.message}`)
                  }
                }}
              />
            </ErrorBoundary>

            <AlertBox level="error">{alert}</AlertBox>
          </Stack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
