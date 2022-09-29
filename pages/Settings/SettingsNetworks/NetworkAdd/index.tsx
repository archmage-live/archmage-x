import { NetworkKind } from '~lib/network'
import { INetwork } from '~lib/schema'

import { EvmNetworkAdd } from './EvmNetworkAdd'

export const NetworkAdd = ({
  networkKind,
  onCancel,
  onConfirm
}: {
  networkKind?: NetworkKind
  onCancel: () => void
  onConfirm: (network: INetwork) => void
}) => {
  switch (networkKind) {
    case NetworkKind.EVM:
      return <EvmNetworkAdd onCancel={onCancel} onConfirm={onConfirm} />
    default:
      return <></>
  }
}
