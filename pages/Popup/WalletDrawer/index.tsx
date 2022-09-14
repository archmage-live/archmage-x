import { AddIcon, DragHandleIcon, LockIcon } from '@chakra-ui/icons'
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

import { WalletId } from '~lib/active'
import { INetwork } from '~lib/schema'
import { PASSWORD_SERVICE } from '~lib/services/passwordService'
import { createTab } from '~lib/util'
import { WalletList } from '~pages/Popup/WalletDrawer/WalletList'
import { WalletEntry } from '~pages/Popup/WalletDrawer/tree'

export const WalletDrawer = ({
  network,
  wallets,
  toggleOpen,
  setSelected,
  activeId,
  onClose
}: {
  network: INetwork | undefined
  wallets?: WalletEntry[]
  toggleOpen: (id: number) => void
  setSelected: (newSelected: WalletId) => void
  activeId?: WalletId
  onClose(): void
}) => {
  const navigate = useNavigate()

  const lock = async () => {
    await PASSWORD_SERVICE.lock()
    navigate('/', { replace: true })
  }

  const btnColorScheme = useColorModeValue('purple', undefined)

  if (!wallets) {
    return <></>
  }

  return (
    <Stack pt={1} pb={4} mt={12} h="calc(100% - 42px)">
      <Divider />

      <Stack overflowY="auto">
        <Stack>
          <Stack spacing="4">
            <WalletList
              network={network}
              wallets={wallets}
              onToggleOpen={toggleOpen}
              onSelected={setSelected}
              activeId={activeId}
              onClose={onClose}
            />
          </Stack>

          <Divider />

          <Button
            variant="ghost"
            colorScheme={btnColorScheme}
            size="lg"
            w="full"
            justifyContent="start"
            onClick={() => {
              createTab('#/tab/add-wallet')
            }}>
            <HStack spacing="3">
              <AddIcon />
              <Text fontSize="lg">Create / Import Wallet</Text>
            </HStack>
          </Button>
          <Button
            variant="ghost"
            colorScheme={btnColorScheme}
            size="lg"
            w="full"
            justifyContent="start"
            onClick={() => {
              createTab('#/tab/settings/wallets')
            }}>
            <HStack spacing="3">
              <DragHandleIcon />
              <Text fontSize="lg">Manage Wallets</Text>
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
      </Stack>
    </Stack>
  )
}
