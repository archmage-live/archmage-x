import {
  Box,
  Button,
  HStack,
  Select,
  SimpleGrid,
  Stack,
  Text
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { useTimeout } from 'react-use'

import { AlertBox } from '~components/AlertBox'
import { SpinningOverlay } from '~components/SpinningOverlay'
import {
  NETWORK_SCOPES,
  NETWORK_SCOPE_ANY,
  NetworkKind,
  NetworkScope,
  getNetworkKind
} from '~lib/network'
import { ChainId, INetwork } from '~lib/schema/network'
import { NETWORK_SERVICE, useNetworks } from '~lib/services/network'
import { NetworkAdd } from '~pages/Settings/SettingsNetworks/NetworkAdd'

import { NetworkEdit } from './NetworkEdit'
import { NetworkList } from './NetworkList'

export const SettingsNetworks = () => {
  const [networkScope, setNetworkScope] = useState<NetworkScope | undefined>(
    NETWORK_SCOPES[0]
  )

  const [networkKind, setNetworkKind] = useState<NetworkKind>()
  const networks = useNetworks(networkKind)
  const [selectedId, setSelectedId] = useState<number>()
  const [editNetwork, setEditNetwork] = useState<INetwork>()
  const [addNetwork, setAddNetwork] = useState<boolean>()

  useEffect(() => {
    setNetworkKind(networkScope ? getNetworkKind(networkScope) : undefined)
    setSelectedId(undefined)
    setAddNetwork(false)
  }, [networkScope])

  useEffect(() => {
    if (selectedId !== undefined) {
      setEditNetwork(networks?.find((net) => net.id === selectedId))
    } else {
      setEditNetwork(undefined)
    }
  }, [networks, selectedId])

  const [loading, setLoading] = useState(false)

  const [isReady] = useTimeout(50)

  return (
    <Box h="full">
      <Stack spacing={12} h="full">
        <SimpleGrid columns={2} spacing={16} h="full">
          <Stack spacing={6}>
            <HStack h={10}>
              <Select
                w="calc(50% - 14px)"
                value={networkScope || NETWORK_SCOPE_ANY}
                onChange={(e) => {
                  setNetworkScope(
                    e.target.value === NETWORK_SCOPE_ANY
                      ? undefined
                      : e.target.value
                  )
                }}>
                {[NETWORK_SCOPE_ANY, ...NETWORK_SCOPES].map((scope) => {
                  return (
                    <option key={scope} value={scope}>
                      {scope}
                    </option>
                  )
                })}
              </Select>
            </HStack>

            <Stack spacing={6} visibility={isReady() ? 'visible' : 'hidden'}>
              {networks?.length && (
                <NetworkList
                  networks={networks}
                  selectedId={selectedId}
                  onSelectedId={(selectedId: number) => {
                    setAddNetwork(false)
                    setSelectedId(selectedId)
                  }}
                />
              )}
            </Stack>
          </Stack>

          <Stack spacing={6}>
            <HStack h={10} justify={!addNetwork ? 'end' : 'center'}>
              {networkKind &&
                networkScope &&
                (!addNetwork ? (
                  <Button
                    size="md"
                    colorScheme="purple"
                    onClick={() => {
                      setSelectedId(undefined)
                      setAddNetwork(true)
                    }}>
                    Add {networkScope} Network
                  </Button>
                ) : (
                  <Text fontSize="lg" fontWeight="medium">
                    New {networkScope} Network
                  </Text>
                ))}
            </HStack>

            {editNetwork && !addNetwork && (
              <NetworkEdit
                network={editNetwork}
                setLoading={setLoading}
                onDelete={() => {
                  setSelectedId(undefined)
                }}
              />
            )}

            {networkKind && !editNetwork && addNetwork && (
              <Stack spacing={12}>
                <AlertBox>
                  A malicious network provider can lie about the state of the
                  blockchain and record your network activity. Only add custom
                  networks you trust.
                </AlertBox>

                <NetworkAdd
                  networkKind={networkKind}
                  onCancel={() => {
                    setAddNetwork(false)
                  }}
                  onConfirm={async (
                    networkKind: NetworkKind,
                    chainId: ChainId,
                    info: any
                  ) => {
                    await NETWORK_SERVICE.addNetwork(networkKind, chainId, info)
                    setAddNetwork(false)
                  }}
                  setLoading={setLoading}
                />
              </Stack>
            )}
          </Stack>
        </SimpleGrid>
      </Stack>

      <SpinningOverlay loading={loading} />
    </Box>
  )
}
