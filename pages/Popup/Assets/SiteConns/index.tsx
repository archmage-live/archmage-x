import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Stack
} from '@chakra-ui/react'

import { useCurrentSiteUrl } from '~lib/util'

export const SiteConnsModal = ({
  isOpen,
  onClose
}: {
  isOpen: boolean
  onClose: () => void
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="lg">
      <ModalOverlay />
      <ModalContent top="15px" my={0}>
        <ModalCloseButton />
        <ModalBody p={0}>
          <SiteConns />
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

const SiteConns = ({}: {}) => {
  const origin = useCurrentSiteUrl()?.origin

  return <Stack></Stack>
}
