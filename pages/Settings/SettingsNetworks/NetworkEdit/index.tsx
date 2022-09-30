import { NetworkKind } from '~lib/network'
import { INetwork } from '~lib/schema/network'

import { CosmNetworkEdit } from './CosmNetworkEdit'
import { EvmNetworkEdit } from './EvmNetworkEdit'

export const NetworkEdit = ({
  network,
  setLoading
}: {
  network?: INetwork
  setLoading: (loading: boolean) => void
}) => {
  switch (network?.kind) {
    case NetworkKind.EVM:
      return (
        <EvmNetworkEdit
          network={network}
          info={network.info}
          setLoading={setLoading}
        />
      )
    case NetworkKind.COSM:
      return <CosmNetworkEdit network={network} info={network.info} />
    default:
      return <></>
  }
}
