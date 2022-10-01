import { Button, HStack, Select, SimpleGrid, Stack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

import {
  NETWORK_SCOPES,
  NETWORK_SCOPE_ANY,
  NetworkKind,
  NetworkScope,
  getNetworkKind
} from '~lib/network'
import { getNetworkInfo, useNetwork, useNetworks } from '~lib/services/network'
import { createTab } from '~lib/util'
import { SubWalletEdit } from '~pages/Settings/SettingsWallets/SubWalletEdit'
import { WalletEdit } from '~pages/Settings/SettingsWallets/WalletEdit'

import { WalletList } from './WalletList'
import { useSelectedWallet } from './select'

export const SettingsWallets = () => {
  const [networkScope, setNetworkScope] = useState<NetworkScope | undefined>(
    NETWORK_SCOPES[0]
  )
  const [networkKind, setNetworkKind] = useState<NetworkKind>()
  useEffect(() => {
    setNetworkKind(getNetworkKind(networkScope))
  }, [networkScope])

  const networksOfKind = useNetworks(networkKind)
  const [networkId, setNetworkId] = useState<number>()
  const network = useNetwork(networkId)

  useEffect(() => {
    if (networksOfKind?.length) {
      setNetworkId(networksOfKind[0].id)
    } else {
      setNetworkId(undefined)
    }
  }, [networksOfKind])

  const {
    selectedId,
    selectedSubId,
    selectedWallet,
    selectedSubWallet,
    setSelectedId,
    setSelectedSubId
  } = useSelectedWallet()

  return (
    <Stack spacing={12} h="full">
      <SimpleGrid columns={2} spacing={16} h="full">
        <Stack spacing={6}>
          <HStack justify="space-around" spacing={8}>
            <Select
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

            <Select
              placeholder={
                networksOfKind && !networksOfKind.length
                  ? `No ${networkScope ? `${networkScope} ` : ''}Network`
                  : undefined
              }
              value={networkId}
              onChange={(e) => {
                setNetworkId(+e.target.value)
              }}>
              {networksOfKind?.map((net) => {
                const info = getNetworkInfo(net)
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
            selectedSubId={selectedSubId}
            onSelectedId={setSelectedId}
            onSelectedSubId={setSelectedSubId}
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

          {selectedWallet &&
            (selectedSubWallet ? (
              network && (
                <SubWalletEdit
                  network={network}
                  wallet={selectedWallet}
                  subWallet={selectedSubWallet}
                  onDelete={() => {
                    setSelectedSubId(undefined)
                  }}
                />
              )
            ) : (
              <WalletEdit
                wallet={selectedWallet}
                onDelete={() => {
                  setSelectedId(undefined)
                }}
              />
            ))}
        </Stack>
      </SimpleGrid>
    </Stack>
  )
}
