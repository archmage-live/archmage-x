import { AddIcon, DragHandleIcon, LockIcon } from '@chakra-ui/icons'
import { Button, Divider, HStack, Icon, Stack, Text } from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import browser from 'webextension-polyfill'

import { WALLET_SERVICE } from '~lib/services/walletService'

interface SidebarProps {
  isOpen: boolean

  onClose(): void
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const wallets = ['Wallet1', 'Wallet2', 'Wallet3']

  const navigate = useNavigate()

  const addWallet = () => {
    browser.tabs.create({
      url: window.location.href + '#/tab'
    })
  }

  const lock = async () => {
    await WALLET_SERVICE.lock()
    navigate('/', { replace: true })
  }

  return (
    <Stack py="4" mt="12">
      <Divider />

      <Stack spacing="4">
        {wallets.map((w) => {
          return (
            <Button key={w} variant="ghost" w="full" justifyContent="start">
              <Text fontSize="lg">{w}</Text>
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
      <Button variant="ghost" w="full" justifyContent="start">
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
