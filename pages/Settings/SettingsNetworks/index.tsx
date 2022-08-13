import { Button, HStack, SimpleGrid, Stack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

import { SwitchBar } from '~components/SwitchBar'
import { NETWORK_SCOPES, NetworkScope, getNetworkType } from '~lib/network'
import { INetwork } from '~lib/schema/network'
import { useNetworks } from '~lib/services/network'

import { NetworkEdit } from './NetworkEdit'
import { NetworkList } from './NetworkList'

export const SettingsNetworks = () => {
  const [networkScope, setNetworkScope] = useState<NetworkScope>(
    NETWORK_SCOPES[0]
  )

  const networks = useNetworks(getNetworkType(networkScope))
  const [selectedId, setSelectedId] = useState<number>()
  const [editNetwork, setEditNetwork] = useState<INetwork>()

  useEffect(() => {
    setSelectedId(undefined)
  }, [networkScope])

  useEffect(() => {
    if (selectedId !== undefined) {
      setEditNetwork(networks?.find((net) => net.id === selectedId))
    } else {
      setEditNetwork(undefined)
    }
  }, [networks, selectedId])

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

          {networks?.length && (
            <NetworkList
              networks={networks}
              selectedId={selectedId}
              onSelectedId={setSelectedId}
            />
          )}
        </Stack>

        <Stack spacing={6}>
          <HStack justify="end">
            <Button size="md" colorScheme="purple">
              Add Network
            </Button>
          </HStack>

          <NetworkEdit network={editNetwork} />
        </Stack>
      </SimpleGrid>
    </Stack>
  )
}
