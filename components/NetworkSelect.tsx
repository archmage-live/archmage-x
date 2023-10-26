import { HStack, Select, SelectProps, StackProps } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

import {
  NETWORK_SCOPES,
  NetworkKind,
  NetworkScope,
  getNetworkKind,
  getNetworkScope
} from '~lib/network'
import { INetwork } from '~lib/schema'
import { getNetworkInfo, useNetwork, useNetworks } from '~lib/services/network'

const NETWORK_SCOPE_ANY = 'Any Network Kind'

interface NetworkSelectCombinerProps extends StackProps {
  onSet: (network?: INetwork) => void
}

export const NetworkSelectCombiner = ({
  onSet,
  ...props
}: NetworkSelectCombinerProps) => {
  const [networkKind, setNetworkKind] = useState<NetworkKind>()

  return (
    <HStack justify="space-around" spacing={8} {...props}>
      <NetworkKindSelect onSetNetworkKind={setNetworkKind} />

      <NetworkSelect networkKind={networkKind} onSetNetwork={onSet} />
    </HStack>
  )
}

interface NetworkKindSelectProps extends SelectProps {
  networkKind?: NetworkKind
  onSetNetworkKind?: (kind?: NetworkKind) => void
}

export const NetworkKindSelect = ({
  networkKind,
  onSetNetworkKind,
  ...props
}: NetworkKindSelectProps) => {
  const [networkScope, setNetworkScope] = useState<NetworkScope | undefined>(
    networkKind ? getNetworkScope(networkKind) : NETWORK_SCOPES[0]
  )

  useEffect(() => {
    onSetNetworkKind?.(getNetworkKind(networkScope))
  }, [onSetNetworkKind, networkScope])

  return (
    <Select
      {...props}
      value={networkScope || NETWORK_SCOPE_ANY}
      onChange={(e) => {
        setNetworkScope(
          e.target.value === NETWORK_SCOPE_ANY ? undefined : e.target.value
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
  )
}

interface NetworkSelectProps extends SelectProps {
  networkKind?: NetworkKind
  network?: INetwork
  onSetNetwork: (network?: INetwork) => void
  allowAnyNetwork?: boolean
}

const NETWORK_ANY_ID = -1

export const NetworkSelect = ({
  networkKind,
  network,
  onSetNetwork,
  allowAnyNetwork,
  ...props
}: NetworkSelectProps) => {
  const networkScope = getNetworkScope(networkKind)

  const networksOfKind = useNetworks(networkKind)
  const [networkId, setNetworkId] = useState<number>()
  const net = useNetwork(networkId !== NETWORK_ANY_ID ? networkId : undefined)

  useEffect(() => {
    if (!networksOfKind) {
      // not ready
      return
    }
    if (networksOfKind.length) {
      if (network && networksOfKind.find((net) => net.id === network.id)) {
        setNetworkId(network.id)
      } else if (allowAnyNetwork) {
        setNetworkId(NETWORK_ANY_ID)
      } else {
        setNetworkId(networksOfKind[0].id)
      }
    } else {
      setNetworkId(undefined)
    }
  }, [network, networksOfKind, allowAnyNetwork])

  useEffect(() => {
    onSetNetwork(net)
  }, [onSetNetwork, net])

  return (
    <Select
      {...props}
      placeholder={
        networksOfKind && !networksOfKind.length
          ? `No ${networkScope ? `${networkScope} ` : ''}Network`
          : undefined
      }
      value={networkId}
      onChange={(e) => {
        setNetworkId(+e.target.value)
      }}>
      {allowAnyNetwork && networkScope && (
        <option value={NETWORK_ANY_ID}>Any {networkScope} Network</option>
      )}
      {networksOfKind?.map((net) => {
        const info = getNetworkInfo(net)
        return (
          <option key={net.id} value={net.id}>
            {info.name}
          </option>
        )
      })}
    </Select>
  )
}
