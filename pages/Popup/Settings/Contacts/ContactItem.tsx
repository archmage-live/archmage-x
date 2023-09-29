import { Button, HStack, Stack, Text } from '@chakra-ui/react'

import { AccountAvatar } from '~components/AccountAvatar'
import { getNetworkScope } from '~lib/network'
import { IContact } from '~lib/schema'
import { getNetworkInfo, useNetwork2 } from '~lib/services/network'
import { shortenString } from '~lib/utils'

export const ContactItem = ({
  contact,
  onClick
}: {
  contact: IContact
  onClick: () => void
}) => {
  const network = useNetwork2(contact.networkKind, contact.chainId)
  const info = network && getNetworkInfo(network)

  return (
    <Button
      as="div"
      cursor="pointer"
      size="lg"
      w="full"
      h="63px"
      px={4}
      justifyContent="start"
      variant="solid-secondary"
      fontSize="md"
      onClick={onClick}>
      <HStack w="full" justify="space-between" fontWeight="normal">
        <HStack>
          <AccountAvatar text={contact.address} scale={0.8} />

          <Stack maxW="120px">
            <Text noOfLines={1} display="block">
              {contact.name}
            </Text>
            <Text noOfLines={1} display="block">
              {contact.memo}
            </Text>
          </Stack>
        </HStack>

        <Stack maxW="80px">
          <Text fontSize="sm" color="gray.500" noOfLines={1} display="block">
            {info ? info.name : getNetworkScope(contact.networkKind)}
          </Text>
          <Text>{shortenString(contact.address)}</Text>
        </Stack>
      </HStack>
    </Button>
  )
}
