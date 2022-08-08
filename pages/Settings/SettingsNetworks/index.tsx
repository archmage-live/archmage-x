import { Box, Button, HStack, SimpleGrid, Stack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

import { SwitchBar } from '~components/SwitchBar'
import { NetworkType } from '~lib/network'
import { INetwork } from '~lib/schema/network'
import { useNetworks } from '~lib/services/network'

import { NetworkEdit } from './NetworkEdit'
import { NetworksLists } from './NetworkLists'

const networkKinds = ['All', 'EVM', 'Cosm', 'Experimental']
type NetworkKind = typeof networkKinds[number]
const networkTypes: { [key in NetworkKind]: NetworkType | undefined } = {
  All: undefined,
  EVM: NetworkType.EVM,
  Cosm: NetworkType.COSM,
  Experimental: NetworkType.OTHER
}

export const SettingsNetworks = () => {
  const [kind, setKind] = useState<NetworkKind>(networkKinds[0])

  const networks = useNetworks(networkTypes[kind])
  const [selectedId, setSelectedId] = useState<number>()
  const [editNetwork, setEditNetwork] = useState<INetwork>()

  useEffect(() => {
    setSelectedId(undefined)
  }, [kind])

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
            <SwitchBar targets={networkKinds} value={kind} onChange={setKind} />
          </HStack>

          {networks?.length && (
            <NetworksLists
              networks={networks}
              selectedId={selectedId}
              onSelectedId={setSelectedId}
            />
          )}
        </Stack>

        <Stack spacing={4}>
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
