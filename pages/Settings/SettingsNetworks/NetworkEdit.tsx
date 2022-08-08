import {
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Stack
} from '@chakra-ui/react'
import { useState } from 'react'

import { SaveInput } from '~components/SaveInput'
import { DB } from '~lib/db'
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
  const [isChainIdInvalid, setIsChainIdInvalid] = useState(false)

  return (
    <Stack spacing="12">
      <FormControl>
        <FormLabel>Network Name</FormLabel>
        <SaveInput
          hideSaveIfNoChange
          stretchInput
          value={info.name}
          validate={(value: string) => value.trim().slice(0, 64) || false}
          onChange={(value: string) => {
            info.name = value
            DB.networks.update(network, { info })
          }}
        />
      </FormControl>

      <FormControl isInvalid={isChainIdInvalid}>
        <FormLabel>Chain ID</FormLabel>
        <SaveInput
          isNumber
          stretchInput
          hideSaveIfNoChange
          props={{
            min: 0,
            step: 1,
            keepWithinRange: true,
            precision: 0
          }}
          value={network.chainId + ''}
          validate={(value: string) => {
            return !isNaN(+value) && +value >= 0
          }}
          asyncValidate={async (value: string) => {
            return !(await DB.networks
              .where({ type: NetworkType.EVM, chainId: +value })
              .first())
          }}
          onChange={(value: string) => {
            const chainId = +value
            info.chainId = chainId
            info.networkId = chainId
            DB.networks.update(network, { chainId, info })
          }}
          onInvalid={setIsChainIdInvalid}
        />
        <FormErrorMessage>This chain ID exists.</FormErrorMessage>
      </FormControl>

      <FormControl>
        <FormLabel>Currency Symbol</FormLabel>
        <SaveInput
          hideSaveIfNoChange
          stretchInput
          value={info.nativeCurrency.symbol}
          validate={(value: string) => value.trim().slice(0, 16) || false}
          onChange={(value: string) => {
            info.nativeCurrency.symbol = value
            DB.networks.update(network, { info })
          }}
        />
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
