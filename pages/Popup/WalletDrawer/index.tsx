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
import { FaWindowMaximize } from '@react-icons/all-files/fa/FaWindowMaximize'
import { FiSearch } from '@react-icons/all-files/fi/FiSearch'
import { IoMdSettings } from '@react-icons/all-files/io/IoMdSettings'
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDebounce } from 'react-use'

import { WalletId } from '~lib/active'
import { Context } from '~lib/rpc'
import { INetwork } from '~lib/schema'
import { PASSWORD_SERVICE } from '~lib/services/passwordService'
import {
  localReorderWallets,
  persistReorderWallets
} from '~lib/services/wallet/reorder'
import { WalletEntry } from '~lib/services/wallet/tree'
import { createTab, createWindow } from '~lib/tab'
import { WalletList } from '~pages/Popup/WalletDrawer/WalletList'

export const WalletDrawer = ({
  network,
  wallets,
  openState,
  toggleOpen,
  setSelected,
  setSearch,
  onClose,
  setScrollOffset,
  setSubScrollOffset
}: {
  network: INetwork | undefined
  wallets?: WalletEntry[]
  openState: Record<number, boolean>
  toggleOpen: (id: number) => void
  setSelected: (newSelected: WalletId) => void
  setSearch: (search: string) => void
  onClose(): void
  setScrollOffset: (offset: number) => void
  setSubScrollOffset: (walletId: number, offset: number) => void
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

  const reorderWallets = useCallback(
    async (
      wallet: WalletEntry,
      placement: 'top' | 'up' | 'down' | 'bottom'
    ) => {
      if (!wallets || wallets.length <= 1) {
        return
      }
      const sourceIndex = wallets.findIndex(
        (w) => w.wallet.id === wallet.wallet.id
      )
      if (sourceIndex < 0) {
        return
      }
      let destinationIndex
      switch (placement) {
        case 'top':
          if (sourceIndex === 0) return
          destinationIndex = 0
          break
        case 'up':
          if (sourceIndex === 0) return
          destinationIndex = sourceIndex - 1
          break
        case 'down':
          if (sourceIndex === wallets.length - 1) return
          destinationIndex = sourceIndex + 1
          break
        case 'bottom':
          if (sourceIndex === wallets.length - 1) return
          destinationIndex = wallets.length - 1
          break
      }

      const [, startSortId, endSortId] = localReorderWallets(
        wallets,
        sourceIndex,
        destinationIndex
      )
      await persistReorderWallets(startSortId, endSortId)
    },
    [wallets]
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
              openState={openState}
              onToggleOpen={toggleOpen}
              onSelected={setSelected}
              onClose={onClose}
              reorderWallets={reorderWallets}
              setScrollOffset={setScrollOffset}
              setSubScrollOffset={setSubScrollOffset}
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
