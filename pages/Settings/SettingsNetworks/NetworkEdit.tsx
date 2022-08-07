import { FormControl, FormLabel, Input, Stack } from '@chakra-ui/react'

import { NetworkType } from '~lib/network'
import { AppChainInfo as CosmChainInfo } from '~lib/network/cosm'
import { EvmChainInfo } from '~lib/network/evm'
import { INetwork } from '~lib/schema/network'

const EvmNetworkEdit = ({
  network,
  info
}: {
  network: INetwork
  info: EvmChainInfo
}) => {
  return (
    <Stack spacing="12">
      <FormControl>
        <FormLabel>Network Name</FormLabel>
        <Input size="lg" value={info.name} />
      </FormControl>

      <FormControl>
        <FormLabel>Chain ID</FormLabel>
        <Input size="lg" value={info.chainId} />
      </FormControl>

      <FormControl>
        <FormLabel>Currency symbol</FormLabel>
        <Input size="lg" value={info.nativeCurrency.symbol} />
      </FormControl>

      <FormControl>
        <FormLabel>RPC URL</FormLabel>
        <Input size="lg" value={info.rpc[0]} />
      </FormControl>

      <FormControl>
        <FormLabel>Block Explorer URL</FormLabel>
        <Input size="lg" value={info.explorers[0].url} />
      </FormControl>
    </Stack>
  )
}

const CosmNetworkEdit = ({
  network,
  info
}: {
  network: INetwork
  info: CosmChainInfo
}) => {
  return (
    <Stack spacing="12">
      <FormControl>
        <FormLabel>Network Name</FormLabel>
        <Input size="lg" value={info.chainName} />
      </FormControl>

      <FormControl>
        <FormLabel>Chain ID</FormLabel>
        <Input size="lg" value={info.chainId} />
      </FormControl>

      <FormControl>
        <FormLabel>Currency symbol</FormLabel>
        <Input size="lg" value={info.feeCurrencies[0].coinDenom} />
      </FormControl>

      <FormControl>
        <FormLabel>RPC URL</FormLabel>
        <Input size="lg" value={info.rpc} />
      </FormControl>

      <FormControl>
        <FormLabel>LCD URL</FormLabel>
        <Input size="lg" value={info.rest} />
      </FormControl>

      <FormControl>
        <FormLabel>Block Explorer URL</FormLabel>
        <Input size="lg" value={info.txExplorer?.txUrl} />
      </FormControl>
    </Stack>
  )
}

export const NetworkEdit = ({ network }: { network?: INetwork }) => {
  switch (network?.type) {
    case NetworkType.EVM:
      return <EvmNetworkEdit network={network} info={network.info} />
    case NetworkType.COSM:
      return <CosmNetworkEdit network={network} info={network.info} />
    case NetworkType.OTHER:
      return <></>
    default:
      return <></>
  }
}
