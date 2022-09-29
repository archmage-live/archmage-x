import {
  Button,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Stack
} from '@chakra-ui/react'
import { useCallback, useState } from 'react'

import { INetwork } from '~lib/schema'

export const EvmNetworkAdd = ({
  onCancel,
  onConfirm
}: {
  onCancel: () => void
  onConfirm: (network: INetwork) => void
}) => {
  const [name, setName] = useState('')
  const [chainId, setChainId] = useState('')
  const [currencySymbol, setCurrencySymbol] = useState('')
  const [rpcUrls, setRpcUrls] = useState<string[]>([])
  const [explorerUrls, setExplorerUrls] = useState<string[]>([])

  const onClick = useCallback(() => {}, [])

  return (
    <Stack spacing="12">
      <FormControl>
        <FormLabel>Network Name</FormLabel>
        <Input value={name} onChange={(e) => setName(e.target.value)}></Input>
      </FormControl>

      <FormControl>
        <FormLabel>Chain ID</FormLabel>
        <Input
          value={chainId}
          onChange={(e) => setChainId(e.target.value)}></Input>
      </FormControl>

      <FormControl>
        <FormLabel>Currency Symbol</FormLabel>
        <Input
          value={currencySymbol}
          onChange={(e) => setCurrencySymbol(e.target.value)}></Input>
      </FormControl>

      <HStack spacing={12}>
        <Button variant="outline" size="lg" flex={1} onClick={onCancel}>
          Cancel
        </Button>
        <Button colorScheme="purple" size="lg" flex={1} onClick={onClick}>
          Add Network
        </Button>
      </HStack>
    </Stack>
  )
}
