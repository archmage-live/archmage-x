import {
  Divider,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Stack,
  Text
} from '@chakra-ui/react'

import { useConnectedSitesBySite } from '~lib/services/connectedSiteService'
import { useCurrentSiteUrl } from '~lib/util'

interface SiteConnectionsModalProps {
  isOpen: boolean
  onClose: () => void
}

export const SiteConnectionsModal = ({
  isOpen,
  onClose
}: SiteConnectionsModalProps) => {
  const site = useCurrentSiteUrl()
  const conns = useConnectedSitesBySite(site?.toString())

  if (conns === undefined) {
    return <></>
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      motionPreset="slideInBottom"
      size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalCloseButton />
        <ModalBody>
          <Text>{site?.host}</Text>
          {!conns.length ? (
            <Text>
              Archmage is not connected to this site. To connect to a Web3 site,
              find and click the connect button.
            </Text>
          ) : (
            <Text>
              You have {conns.length} account{conns.length > 1 && 's'} connected
              to this site.
            </Text>
          )}
          <Stack spacing={4}>
            <Divider />

            {conns.map((conn) => {
              return <></>
            })}
          </Stack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
