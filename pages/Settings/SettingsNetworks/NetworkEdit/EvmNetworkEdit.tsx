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
import { NetworkKind } from '~lib/network'
import { EvmChainInfo } from '~lib/network/evm'
import { INetwork } from '~lib/schema'

export const EvmNetworkEdit = ({
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
              .where({ kind: NetworkKind.EVM, chainId: +value })
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
