import { DragHandleIcon } from '@chakra-ui/icons'
import {
  Button,
  Divider,
  HStack,
  Stack,
  Text,
  useColorModeValue
} from '@chakra-ui/react'

import { createTab } from '~lib/util'

import { NetworkList } from './NetworkList'

export const NetworkDrawer = ({ onClose }: { onClose(): void }) => {
  const btnColorScheme = useColorModeValue('purple', undefined)

  return (
    <Stack pt={1} pb={4} mt={12} overflowY="auto">
      <Divider />

      <Stack spacing="4">
        <NetworkList onSelected={onClose} />
      </Stack>

      <Divider />

      <Button
        variant="ghost"
        colorScheme={btnColorScheme}
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
