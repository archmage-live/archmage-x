import { Button, HStack, Select, SimpleGrid, Stack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

import { SwitchBar } from '~components/SwitchBar'
import {
  NETWORK_KIND_SCOPES,
  NETWORK_KIND_SCOPE_ANY,
  NetworkKind,
  NetworkKindScope,
  getNetworkKind
} from '~lib/network'
import { INetwork } from '~lib/schema/network'
import { useNetwork, useNetworks } from '~lib/services/network'
import { useWallet } from '~lib/services/walletService'
import { createTab } from '~lib/util'
import {
  NetworkBasicInfo,
  getBasicInfo
} from '~pages/Settings/SettingsNetworks/NetworkItem'
import { WalletEdit } from '~pages/Settings/SettingsWallets/WalletEdit'

import { WalletList } from './WalletList'

export const SettingsWallets = () => {
  const [networkScope, setNetworkScope] = useState<
    NetworkKindScope | undefined
  >(NETWORK_KIND_SCOPES[0])
  const [networkKind, setNetworkKind] = useState<NetworkKind>()
  useEffect(() => {
    setNetworkKind(getNetworkKind(networkScope))
  }, [networkScope])

  const networksOfKind = useNetworks(undefined, networkKind)
  const [networkId, setNetworkId] = useState<number>()
  const network = useNetwork(networkId)

  useEffect(() => {
    if (networksOfKind?.length) {
      setNetworkId(networksOfKind[0].id)
    } else {
      setNetworkId(undefined)
    }
  }, [networksOfKind])

  const [selectedId, setSelectedId] = useState<number>()
  const selectedWallet = useWallet(selectedId)

  return (
    <Stack spacing={12} h="full">
      <SimpleGrid columns={2} spacing={16} h="full">
        <Stack spacing={6}>
          <HStack justify="space-around" spacing={8}>
            <Select
              value={networkScope || NETWORK_KIND_SCOPE_ANY}
              onChange={(e) => {
                setNetworkScope(
                  e.target.value === NETWORK_KIND_SCOPE_ANY
                    ? undefined
                    : e.target.value
                )
              }}>
              {[NETWORK_KIND_SCOPE_ANY, ...NETWORK_KIND_SCOPES].map((scope) => {
                return (
                  <option key={scope} value={scope}>
                    {scope}
                  </option>
                )
              })}
            </Select>

            <Select
              placeholder={
                !networksOfKind?.length
                  ? `No ${networkScope ? `${networkScope} ` : ''}Network`
                  : undefined
              }
              value={networkId}
              onChange={(e) => {
                setNetworkId(+e.target.value)
              }}>
              {networksOfKind?.map((net) => {
                const info = getBasicInfo(net)
                return (
                  <option key={net.id} value={net.id}>
                    {info.name}
                  </option>
                )
              })}
            </Select>
          </HStack>

          <WalletList
            network={network}
            selectedId={selectedId}
            onSelectedId={setSelectedId}
          />
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
