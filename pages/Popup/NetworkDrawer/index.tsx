import { DragHandleIcon } from '@chakra-ui/icons'
import { Button, Divider, HStack, Stack, Text } from '@chakra-ui/react'

import { createTab } from '~lib/util'

import { NetworkList } from './NetworkList'

export const NetworkDrawer = ({ onClose }: { onClose(): void }) => {
  return (
    <Stack pt={1} pb={4} mt={12}>
      <Divider />

      <Stack spacing="4">
        <NetworkList onSelected={onClose} />
      </Stack>

      <Divider />

      <Button
        variant="ghost"
        colorScheme="purple"
        size="lg"
        w="full"
        justifyContent="start"
        onClick={() => createTab('#/tab/settings/networks')}>
        <HStack spacing="3">
          <DragHandleIcon />
          <Text fontSize="lg">Manage Networks</Text>
        </HStack>
      </Button>
    </Stack>
  )
}
