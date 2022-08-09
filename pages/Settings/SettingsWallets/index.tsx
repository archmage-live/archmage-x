import { Button, HStack, SimpleGrid, Stack } from '@chakra-ui/react'
import { useState } from 'react'

import { SwitchBar } from '~components/SwitchBar'
import { NETWORK_SCOPES, NetworkScope } from '~lib/network'
import { useWallet } from '~lib/services/walletService'
import { createTab } from '~lib/util'
import { WalletEdit } from '~pages/Settings/SettingsWallets/WalletEdit'

import { WalletList } from './WalletList'

export const SettingsWallets = () => {
  const [networkScope, setNetworkScope] = useState<NetworkScope>(
    NETWORK_SCOPES[0]
  )

  const [selectedId, setSelectedId] = useState<number>()
  const selectedWallet = useWallet(selectedId)

  return (
    <Stack spacing={12} h="full">
      <SimpleGrid columns={2} spacing={16} h="full">
        <Stack spacing={6}>
          <HStack justify="center">
            <SwitchBar
              targets={NETWORK_SCOPES}
              value={networkScope}
              onChange={setNetworkScope}
            />
          </HStack>

          <WalletList selectedId={selectedId} onSelectedId={setSelectedId} />
        </Stack>

        <Stack spacing={6}>
          <HStack justify="end">
            <Button
              size="md"
              colorScheme="purple"
              onClick={() => {
                createTab('#/tab/add-wallet')
              }}>
              Add Wallet
            </Button>
          </HStack>

          {selectedWallet && <WalletEdit wallet={selectedWallet} />}
        </Stack>
      </SimpleGrid>
    </Stack>
  )
}
