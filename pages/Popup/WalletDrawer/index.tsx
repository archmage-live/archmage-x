import { AddIcon, DragHandleIcon, LockIcon } from '@chakra-ui/icons'
import { Button, Divider, HStack, Icon, Stack, Text } from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'

import { WALLET_SERVICE, useWallets } from '~lib/services/walletService'
import { createTab } from '~lib/util'

export const WalletDrawer = ({ onClose }: { onClose(): void }) => {
  const wallets = useWallets()

  const navigate = useNavigate()

  const addWallet = () => {
    createTab('#/tab/add-wallet')
  }

  const manageWallets = () => {
    createTab('#/tab/settings/wallets')
  }

  const lock = async () => {
    await WALLET_SERVICE.lock()
    navigate('/', { replace: true })
  }

  return (
    <Stack py="4" mt="12">
      <Divider />

      <Stack spacing="4">
        {wallets?.map((w) => {
          return (
            <Button key={w.id} variant="ghost" w="full" justifyContent="start">
              <Text fontSize="lg">{w.name}</Text>
            </Button>
          )
        })}
      </Stack>

      <Divider />

      <Button
        variant="ghost"
        w="full"
        justifyContent="start"
        onClick={addWallet}>
        <HStack spacing="3">
          <AddIcon />
          <Text fontSize="lg">Add Wallet</Text>
        </HStack>
      </Button>
      <Button
        variant="ghost"
        w="full"
        justifyContent="start"
        onClick={manageWallets}>
        <HStack spacing="3">
          <DragHandleIcon />
          <Text fontSize="lg">Manage Wallets</Text>
        </HStack>
      </Button>

      <Divider />

      <Button variant="ghost" w="full" justifyContent="start" onClick={lock}>
        <HStack spacing="3">
          <LockIcon />
          <Text fontSize="lg">Lock</Text>
        </HStack>
      </Button>
    </Stack>
  )
}
