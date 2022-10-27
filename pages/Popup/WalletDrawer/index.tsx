import { AddIcon, DragHandleIcon, LockIcon } from '@chakra-ui/icons'
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
import { useState } from 'react'
import { FaWindowMaximize } from 'react-icons/fa'
import { FiSearch } from 'react-icons/fi'
import { IoMdSettings } from 'react-icons/io'
import { useNavigate } from 'react-router-dom'
import { useDebounce } from 'react-use'

import { WalletId } from '~lib/active'
import { Context } from '~lib/rpc'
import { INetwork } from '~lib/schema'
import { PASSWORD_SERVICE } from '~lib/services/passwordService'
import { createTab, createWindow } from '~lib/util'
import { WalletList } from '~pages/Popup/WalletDrawer/WalletList'
import { WalletEntry } from '~pages/Popup/WalletDrawer/tree'

export const WalletDrawer = ({
  network,
  wallets,
  toggleOpen,
  setSelected,
  setSearch,
  onClose
}: {
  network: INetwork | undefined
  wallets?: WalletEntry[]
  toggleOpen: (id: number) => void
  setSelected: (newSelected: WalletId) => void
  setSearch: (search: string) => void
  onClose(): void
}) => {
  const navigate = useNavigate()

  const lock = async () => {
    await PASSWORD_SERVICE.lock()
    navigate('/', { replace: true })
  }

  const btnColor = useColorModeValue('gray.600', undefined)

  const [search, _setSearch] = useState('')

  useDebounce(
    () => {
      setSearch(search)
    },
    300,
    [search]
  )

  if (!wallets) {
    return <></>
  }

  return (
    <Stack pt={2} pb={4} h="full">
      <Box ps={4} pe={8} me="32px">
        <InputGroup w="full" size="md">
          <InputLeftElement pointerEvents="none">
            <Icon as={FiSearch} />
          </InputLeftElement>
          <Input
            placeholder="Search wallet or account"
            value={search}
            onChange={(e) => _setSearch(e.target.value)}
          />
        </InputGroup>
      </Box>

      <Divider />

      <Stack overflowY="auto">
        <Stack>
          <Stack spacing="4">
            <WalletList
              network={network}
              wallets={wallets}
              onToggleOpen={toggleOpen}
              onSelected={setSelected}
              onClose={onClose}
            />
          </Stack>

          <Divider />

          <Button
            variant="ghost"
            size="lg"
            w="full"
            justifyContent="start"
            onClick={async () => {
              await createTab('#/tab/add-wallet')
            }}>
            <HStack spacing="3" color={btnColor}>
              <AddIcon />
              <Text fontSize="lg">Create / Import Wallet</Text>
            </HStack>
          </Button>
          <Button
            variant="ghost"
            size="lg"
            w="full"
            justifyContent="start"
            onClick={async () => {
              await createTab('#/tab/settings/wallets')
            }}>
            <HStack spacing="3" color={btnColor}>
              <DragHandleIcon />
              <Text fontSize="lg">Manage Wallets</Text>
            </HStack>
          </Button>

          <Divider />

          <Button
            variant="ghost"
            size="lg"
            w="full"
            justifyContent="start"
            onClick={lock}>
            <HStack spacing="3" color={btnColor}>
              <LockIcon />
              <Text fontSize="lg">Lock</Text>
            </HStack>
          </Button>

          <Button
            variant="ghost"
            size="lg"
            w="full"
            justifyContent="start"
            onClick={async () => {
              await createTab('#/tab/settings/general')
            }}>
            <HStack spacing="3" color={btnColor}>
              <Icon as={IoMdSettings} />
              <Text fontSize="lg">Settings</Text>
            </HStack>
          </Button>

          <Button
            variant="ghost"
            size="lg"
            w="full"
            justifyContent="start"
            onClick={async () => {
              const {
                screenX: x,
                screenY: y,
                outerWidth: width,
                outerHeight: height
              } = globalThis
              const ctx = {
                window: {
                  x,
                  y,
                  width,
                  height
                }
              } as Context
              await createWindow(ctx, '/')
            }}>
            <HStack spacing="3" color={btnColor}>
              <Icon as={FaWindowMaximize} />
              <Text fontSize="lg">Popup</Text>
            </HStack>
          </Button>
        </Stack>
      </Stack>
    </Stack>
  )
}
