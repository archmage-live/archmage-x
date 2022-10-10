import { FormControl, FormLabel, Input, Stack } from '@chakra-ui/react'

import { CosmChainInfo } from '~lib/network/cosm'
import { INetwork } from '~lib/schema'

export const CosmNetworkEdit = ({
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
