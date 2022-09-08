import { DragHandleIcon, LockIcon } from '@chakra-ui/icons'
import {
  Button,
  Divider,
  HStack,
  Icon,
  Stack,
  Text,
  useColorModeValue
} from '@chakra-ui/react'
import { IoMdSettings } from 'react-icons/io'
import { useNavigate } from 'react-router-dom'

import { PASSWORD_SERVICE } from '~lib/services/passwordService'
import { createTab } from '~lib/util'

import { NetworkList } from './NetworkList'

export const NetworkDrawer = ({ onClose }: { onClose(): void }) => {
  const navigate = useNavigate()
  const lock = async () => {
    await PASSWORD_SERVICE.lock()
    navigate('/', { replace: true })
  }

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

      <Divider />

      <Button
        variant="ghost"
        colorScheme={btnColorScheme}
        size="lg"
        w="full"
        justifyContent="start"
        onClick={lock}>
        <HStack spacing="3">
          <LockIcon />
          <Text fontSize="lg">Lock</Text>
        </HStack>
      </Button>

      <Button
        variant="ghost"
        colorScheme={btnColorScheme}
        size="lg"
        w="full"
        justifyContent="start"
        onClick={() => {
          createTab('#/tab/settings/general')
        }}>
        <HStack spacing="3">
          <Icon as={IoMdSettings} />
          <Text fontSize="lg">Settings</Text>
        </HStack>
      </Button>
    </Stack>
  )
}
