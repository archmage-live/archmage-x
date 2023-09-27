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
      <NetworkKindSelect onSet={setNetworkKind} />

      <NetworkSelect networkKind={networkKind} onSet={onSet} />
    </HStack>
  )
}

interface NetworkKindSelectProps extends SelectProps {
  onSet: (kind?: NetworkKind) => void
}

export const NetworkKindSelect = ({
  onSet,
  ...props
}: NetworkKindSelectProps) => {
  const [networkScope, setNetworkScope] = useState<NetworkScope | undefined>(
    NETWORK_SCOPES[0]
  )
  useEffect(() => {
    onSet(getNetworkKind(networkScope))
  }, [onSet, networkScope])

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
  onSet: (network?: INetwork) => void
}

export const NetworkSelect = ({
  networkKind,
  onSet,
  ...props
}: NetworkSelectProps) => {
  const networkScope = getNetworkScope(networkKind)

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

  useEffect(() => {
    onSet(network)
  }, [onSet, network])

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
