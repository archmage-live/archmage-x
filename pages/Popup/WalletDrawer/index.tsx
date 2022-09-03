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
import assert from 'assert'
import { useCallback, useEffect, useState } from 'react'
import { IoMdSettings } from 'react-icons/io'
import { useNavigate } from 'react-router-dom'

import { ActiveWalletId, useActiveNetwork, useActiveWallet } from '~lib/active'
import { PASSWORD_SERVICE } from '~lib/services/passwordService'
import { WALLET_SERVICE, useWallets } from '~lib/services/walletService'
import { createTab } from '~lib/util'
import { WalletList } from '~pages/Popup/WalletDrawer/WalletList'

export const WalletDrawer = ({ onClose }: { onClose(): void }) => {
  const navigate = useNavigate()

  const wallets = useWallets()

  const { network } = useActiveNetwork()
  const { walletId, setWalletId } = useActiveWallet()

  const [selectedId, setSelectedId] = useState<number>()
  const [selectedSubId, setSelectedSubId] = useState<number>()

  useEffect(() => {
    if (walletId) {
      setSelectedId(walletId.masterId)
      setSelectedSubId(walletId.subId)
    }
  }, [walletId])

  const setSubId = useCallback(
    async (id: number) => {
      setSelectedSubId(id)
      const subWallet = await WALLET_SERVICE.getSubWallet(id)
      assert(subWallet)
      await setWalletId({
        masterId: subWallet.masterId,
        subId: id
      } as ActiveWalletId)
    },
    [selectedId, setWalletId]
  )

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
              selectedId={selectedId}
              onSelectedId={setSelectedId}
              selectedSubId={selectedSubId}
              onSelectedSubId={setSubId}
              activeId={walletId}
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
              <Text fontSize="lg">Create/Import Wallet</Text>
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
