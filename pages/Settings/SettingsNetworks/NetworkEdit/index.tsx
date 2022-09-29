import { NetworkKind } from '~lib/network'
import { INetwork } from '~lib/schema/network'

import { CosmNetworkEdit } from './CosmNetworkEdit'
import { EvmNetworkEdit } from './EvmNetworkEdit'

export const NetworkEdit = ({ network }: { network?: INetwork }) => {
  switch (network?.kind) {
    case NetworkKind.EVM:
      return <EvmNetworkEdit network={network} info={network.info} />
    case NetworkKind.COSM:
      return <CosmNetworkEdit network={network} info={network.info} />
    default:
      return <></>
  }
}
