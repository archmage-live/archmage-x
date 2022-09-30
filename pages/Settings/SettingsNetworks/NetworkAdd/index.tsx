import { NetworkKind } from '~lib/network'
import { ChainId } from '~lib/schema'

import { EvmNetworkAdd } from './EvmNetworkAdd'

export const NetworkAdd = ({
  networkKind,
  onCancel,
  onConfirm,
  setLoading
}: {
  networkKind?: NetworkKind
  onCancel: () => void
  onConfirm: (
    networkKind: NetworkKind,
    chainId: ChainId,
    info: any
  ) => Promise<void>
  setLoading: (loading: boolean) => void
}) => {
  switch (networkKind) {
    case NetworkKind.EVM:
      return (
        <EvmNetworkAdd
          onCancel={onCancel}
          onConfirm={onConfirm}
          setLoading={setLoading}
        />
      )
    default:
      return <></>
  }
}
