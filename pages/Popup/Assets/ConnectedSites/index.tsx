import {
  Box,
  Button,
  Divider,
  HStack,
  Icon,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text
} from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
import { FaGlobeAmericas } from 'react-icons/fa'

import { useActive } from '~lib/active'
import { IConnectedSite } from '~lib/schema'
import {
  CONNECTED_SITE_SERVICE,
  useConnectedSitesByAccount
} from '~lib/services/connectedSiteService'

export const ConnectedSitesModal = ({
  isOpen,
  onClose
}: {
  isOpen: boolean
  onClose: () => void
}) => {
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
        <ModalHeader>Connected Sites</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={3}>
          <ConnectedSites />
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

const ConnectedSites = () => {
  const { wallet, subWallet, account } = useActive()

  const sites = useConnectedSitesByAccount(account)

  const parentRef = useRef(null)
  const sitesVirtualizer = useVirtualizer({
    count: sites?.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    getItemKey: (index) => sites![index].id
  })

  return (
    <Stack spacing={6}>
      <Text color="gray.500" fontSize="md">
        {subWallet?.name ? subWallet.name : wallet?.name}
        &nbsp;is connected to these sites. They can view your account address.
      </Text>

      <Box ref={parentRef} maxH="465.25px" overflowY="auto">
        <Box h={sitesVirtualizer.getTotalSize() + 'px'} position="relative">
          {sitesVirtualizer.getVirtualItems().map((item) => {
            const site = sites![item.index]
            return (
              <Stack
                key={site.id}
                ref={item.measureElement}
                position="absolute"
                top={0}
                left={0}
                transform={`translateY(${item.start}px)`}
                w="full"
                spacing={3}
                pb={3}>
                <Divider />
                <ConnectedSiteItem key={site.id} site={site} />
              </Stack>
            )
          })}
        </Box>
      </Box>
    </Stack>
  )
}

const ConnectedSiteItem = ({ site }: { site: IConnectedSite }) => {
  return (
    <HStack justify="space-between">
      <HStack maxW="calc(100% - 90px)">
        <Image
          borderRadius="full"
          boxSize="25px"
          fit="cover"
          src={site.iconUrl}
          fallback={<Icon as={FaGlobeAmericas} fontSize="3xl" />}
          alt="Site Icon"
        />
        <Text noOfLines={2}>{site.origin && new URL(site.origin).host}</Text>
      </HStack>

      <Button
        variant="ghost"
        size="sm"
        onClick={async () => {
          await CONNECTED_SITE_SERVICE.disconnectSite(site.id)
        }}>
        Disconnect
      </Button>
    </HStack>
  )
}
