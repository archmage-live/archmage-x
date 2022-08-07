import { Box, HStack, SimpleGrid, Stack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

import { SwitchBar } from '~components/SwitchBar'
import { NetworkType } from '~lib/network'
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
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    setSelected(0)
  }, [kind])

  return (
    <Stack spacing={12} h="full">
      <SimpleGrid columns={2} spacing={16} h="full">
        <Stack spacing={6}>
          <HStack justify="center">
            <SwitchBar targets={networkKinds} value={kind} onChange={setKind} />
          </HStack>

          {networks && (
            <NetworksLists
              networks={networks}
              selected={selected}
              onSelected={setSelected}
            />
          )}
        </Stack>

        <Box>
          <NetworkEdit network={networks?.[selected]} />
        </Box>
      </SimpleGrid>
    </Stack>
  )
}
