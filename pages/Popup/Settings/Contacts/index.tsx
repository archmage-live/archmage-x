import { Box, Button, Stack, Text, useDisclosure } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef, useState } from 'react'

import { IContact } from '~lib/schema'
import { useContacts } from '~lib/services/contactService'

import { ContactAddOrEditModal } from './ContactAddOrEdit'
import { ContactItem } from './ContactItem'

export const Contacts = () => {
  const contacts = useContacts()

  const parentRef = useRef(null)
  const virtualizer = useVirtualizer({
    count: contacts?.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    getItemKey: (index) => contacts![index].id
  })

  const [selectedContact, setSelectedContact] = useState<IContact>()

  const { isOpen, onOpen, onClose } = useDisclosure()

  return (
    <Stack h="full" justify="space-between" spacing={4}>
      <Box flex={1} ref={parentRef} overflowY="auto" userSelect="none">
        <Box h={virtualizer.getTotalSize() + 'px'} position="relative">
          {virtualizer.getVirtualItems().map((item) => {
            const contact = contacts![item.index]

            return (
              <Box
                key={contact.id}
                position="absolute"
                top={0}
                left={0}
                transform={`translateY(${item.start}px)`}
                w="full"
                minH="64px"
                py={2}
                ref={virtualizer.measureElement}
                data-index={item.index}>
                <ContactItem
                  contact={contact}
                  onClick={() => {
                    setSelectedContact(contact)
                    onOpen()
                  }}
                />
              </Box>
            )
          })}
        </Box>
      </Box>

      {!contacts?.length && (
        <Text
          textAlign="center"
          fontSize="xl"
          fontWeight="medium"
          color="gray.500">
          No Address
        </Text>
      )}

      <Button
        size="lg"
        onClick={() => {
          setSelectedContact(undefined)
          onOpen()
        }}>
        Add Address
      </Button>

      <ContactAddOrEditModal
        contact={selectedContact}
        isOpen={isOpen}
        onClose={onClose}
      />
    </Stack>
  )
}
