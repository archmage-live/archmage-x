import { ChevronLeftIcon } from '@chakra-ui/icons'
import { Box, HStack, IconButton, Stack, Text } from '@chakra-ui/react'

export const Send = ({
  isOpen,
  onClose
}: {
  isOpen: boolean
  onClose: () => void
}) => {
  return (
    <Stack h="full" px={4} pt={2} pb={4} justify="space-between">
      <Stack spacing={12}>
        <HStack justify="space-between" minH={16}>
          <IconButton
            icon={<ChevronLeftIcon fontSize="2xl" />}
            aria-label="Close"
            variant="ghost"
            borderRadius="full"
            size="sm"
            onClick={onClose}
          />

          <Text textAlign="center" fontSize="3xl" fontWeight="medium">
            Safe Account Settings
          </Text>

          <Box w={10}></Box>
        </HStack>
      </Stack>
    </Stack>
  )
}
