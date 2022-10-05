import { DragHandleIcon, LockIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Divider,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Stack,
  Text,
  useColorModeValue
} from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { FiSearch } from 'react-icons/fi'
import { IoMdSettings } from 'react-icons/io'
import { useNavigate } from 'react-router-dom'
import { useDebounce } from 'react-use'

import { INetwork } from '~lib/schema'
import { useNetworks } from '~lib/services/network'
import { PASSWORD_SERVICE } from '~lib/services/passwordService'
import { createTab } from '~lib/util'

import { NetworkList } from './NetworkList'

export const NetworkDrawer = ({ onClose }: { onClose(): void }) => {
  const navigate = useNavigate()
  const lock = async () => {
    await PASSWORD_SERVICE.lock()
    navigate('/', { replace: true })
  }

  const allNetworks = useNetworks()

  const btnColorScheme = useColorModeValue('purple', undefined)

  const [search, setSearch] = useState('')
  const [_search, _setSearch] = useState('')

  useDebounce(
    () => {
      _setSearch(search)
    },
    300,
    [search]
  )

  const networks = useMemo(() => {
    const key = _search.trim().toLowerCase()
    if (!allNetworks || !key) {
      return allNetworks || []
    }
    return allNetworks.filter((network) =>
      network.search.toLowerCase().includes(key)
    )
  }, [allNetworks, _search])

  return (
    <Stack pt={2} pb={4} h="full">
      <Box ps={4} pe={8} me="32px">
        <InputGroup w="full" size="md">
          <InputLeftElement pointerEvents="none">
            <Icon as={FiSearch} />
          </InputLeftElement>
          <Input
            placeholder="Search network"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup>
      </Box>

      <Divider />

      <Stack overflowY="auto">
        <Stack>
          <Stack spacing="4">
            <NetworkList networks={networks} onSelected={onClose} />
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
            onClick={async () => {
              await createTab('#/tab/settings/general')
            }}>
            <HStack spacing="3">
              <Icon as={IoMdSettings} />
              <Text fontSize="lg">Settings</Text>
            </HStack>
          </Button>
        </Stack>
      </Stack>
    </Stack>
  )
}
