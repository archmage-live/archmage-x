import { NetworkKind } from '~lib/network'
import { INetwork } from '~lib/schema/network'

import { AptosNetworkEdit } from './AptosNetworkEdit'
import { CosmNetworkEdit } from './CosmNetworkEdit'
import { EvmNetworkEdit } from './EvmNetworkEdit'

export const NetworkEdit = ({
  network,
  setLoading,
  onDelete
}: {
  network?: INetwork
  setLoading: (loading: boolean) => void
  onDelete: () => void
}) => {
  switch (network?.kind) {
    case NetworkKind.EVM:
      return (
        <EvmNetworkEdit
          network={network}
          info={network.info}
          setLoading={setLoading}
          onDelete={onDelete}
        />
      )
    case NetworkKind.COSM:
      return <CosmNetworkEdit network={network} info={network.info} />
    case NetworkKind.APTOS:
      return (
        <AptosNetworkEdit
          network={network}
          info={network.info}
          setLoading={setLoading}
          onDelete={onDelete}
        />
      )
    default:
      return <></>
  }
}
