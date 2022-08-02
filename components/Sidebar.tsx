import { AddIcon, DragHandleIcon, LockIcon } from '@chakra-ui/icons'
import { Button, Divider, HStack, Icon, Stack, Text } from '@chakra-ui/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import browser from 'webextension-polyfill'

import { DB } from '~lib/db'
import { WALLET_SERVICE } from '~lib/services/walletService'

interface SidebarProps {
  isOpen: boolean

  onClose(): void
}

function getRootHref() {
  let href = window.location.href
  const url = new URL(href)
  const searchIndex = url.search ? href.lastIndexOf(url.search) : -1
  const hashIndex = url.hash ? href.lastIndexOf(url.hash) : -1
  return href.slice(
    0,
    searchIndex > -1 ? searchIndex : hashIndex > -1 ? hashIndex : href.length
  )
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const wallets = useLiveQuery(() => DB.wallets.toArray())

  const navigate = useNavigate()

  const addWallet = () => {
    browser.tabs.create({
      url: getRootHref() + '#/tab/add-wallet'
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
