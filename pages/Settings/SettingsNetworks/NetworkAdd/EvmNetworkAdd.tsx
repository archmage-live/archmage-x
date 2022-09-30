import {
  Button,
  FormControl,
  FormLabel,
  HStack,
  Input,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Stack
} from '@chakra-ui/react'
import { JsonRpcProvider } from '@ethersproject/providers/src.ts/json-rpc-provider'
import { useCallback, useEffect, useRef, useState } from 'react'

import { AlertBox } from '~components/AlertBox'
import { NetworkKind } from '~lib/network'
import { EvmChainInfo } from '~lib/network/evm'
import { ChainId } from '~lib/schema'
import { NETWORK_SERVICE } from '~lib/services/network'
import { stall } from '~lib/util'

import { RpcUrlInputGroup, UrlInputGroup, checkUrl } from './UrlInputGroup'

export const EvmNetworkAdd = ({
  onCancel,
  onConfirm,
  setLoading
}: {
  onCancel: () => void
  onConfirm: (
    networkKind: NetworkKind,
    chainId: ChainId,
    info: any
  ) => Promise<void>
  setLoading: (loading: boolean) => void
}) => {
  const [name, setName] = useState('')
  const [chainIdStr, setChainIdStr] = useState('')
  const [currencySymbol, setCurrencySymbol] = useState('')
  const [rpcUrls, setRpcUrls] = useState<string[]>([''])
  const [explorerUrls, setExplorerUrls] = useState<string[]>([''])

  const [allowInvalidRpcUrl, setAllowInvalidRpcUrl] = useState(false)

  const [isDisabled, setIsDisabled] = useState(false)
  const [alert, setAlert] = useState('')
  useEffect(() => {
    setIsDisabled(false)
    setAlert('')
  }, [
    name,
    chainIdStr,
    currencySymbol,
    rpcUrls,
    explorerUrls,
    allowInvalidRpcUrl
  ])

  const checkUrls = useRef<() => Promise<string[] | undefined>>()

  const onClick = useCallback(async () => {
    const confirm = async () => {
      if (!name.length) {
        setAlert('Empty network name')
        return
      }

      if (!chainIdStr.length) {
        setAlert('Empty chain ID')
        return
      }
      const chainId = +chainIdStr
      if (
        await NETWORK_SERVICE.getNetwork({
          kind: NetworkKind.EVM,
          chainId
        })
      ) {
        setAlert(`There exists a network with the same chain ID ${chainId}`)
        return
      }

      if (!currencySymbol.length) {
        setAlert('Empty currency symbol')
        return
      }

      const checkedExplorerUrls = explorerUrls.map(checkUrl)
      if (checkedExplorerUrls.some((url) => !url)) {
        setAlert('Invalid explorer url(s)')
        return
      }
      if (new Set(checkedExplorerUrls).size !== checkedExplorerUrls.length) {
        setAlert('Duplicate explorer url(s)')
        return
      }

      const checkedRpcUrls = await checkUrls.current?.()
      if (!checkedRpcUrls) {
        setIsDisabled(true)
        return
      }

      const info = {
        name,
        shortName: currencySymbol.toLowerCase(),
        chain: currencySymbol,
        chainId,
        networkId: chainId,
        rpc: checkedRpcUrls,
        explorers: checkedExplorerUrls.map((url) => ({
          name: '',
          url,
          standard: 'none'
        })),
        infoURL: '',
        nativeCurrency: {
          name: currencySymbol,
          symbol: currencySymbol,
          decimals: 18 // TODO
        }
      } as EvmChainInfo

      await onConfirm(NetworkKind.EVM, chainId, info)
    }

    await Promise.all([confirm(), stall(500)])
    setLoading(false)
  }, [onConfirm, setLoading, name, chainIdStr, currencySymbol, explorerUrls])

  return (
    <Stack spacing="12">
      <FormControl>
        <FormLabel>Network Name</FormLabel>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            setName((name) => name.trim().slice(0, 64))
          }}
        />
      </FormControl>

      <FormControl>
        <FormLabel>Chain ID</FormLabel>
        <NumberInput
          min={0}
          step={1}
          precision={0}
          keepWithinRange
          allowMouseWheel
          value={chainIdStr}
          onChange={(str, num) => {
            if (Number.isNaN(num)) {
              setChainIdStr('')
            } else {
              setChainIdStr(str.trim())
            }
          }}>
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>

      <FormControl>
        <FormLabel>Currency Symbol</FormLabel>
        <Input
          value={currencySymbol}
          onChange={(e) => setCurrencySymbol(e.target.value)}
          onBlur={() => {
            setCurrencySymbol((currencySymbol) =>
              currencySymbol.trim().slice(0, 64)
            )
          }}
        />
      </FormControl>

      <RpcUrlInputGroup
        urls={rpcUrls}
        setUrls={setRpcUrls}
        testUrl={getBlockNumber}
        chainId={chainIdStr ? +chainIdStr : undefined}
        getChainId={getChainId}
        checkUrls={checkUrls}
        allowInvalidRpcUrl={allowInvalidRpcUrl}
        setAllowInvalidRpcUrl={setAllowInvalidRpcUrl}
        setLoading={setLoading}
      />

      <FormControl>
        <FormLabel>Block Explorer Url(s)</FormLabel>
        <UrlInputGroup urls={explorerUrls} setUrls={setExplorerUrls} />
      </FormControl>

      <AlertBox>{alert}</AlertBox>

      <HStack spacing={12}>
        <Button variant="outline" size="lg" flex={1} onClick={onCancel}>
          Cancel
        </Button>
        <Button
          colorScheme="purple"
          size="lg"
          flex={1}
          isDisabled={isDisabled || !!alert}
          onClick={onClick}>
          Add Network
        </Button>
      </HStack>
    </Stack>
  )
}

export async function getBlockNumber(url: string) {
  const provider = new JsonRpcProvider({
    url,
    throttleLimit: 1,
    timeout: 3000
  })
  return await provider.getBlockNumber()
}

export async function getChainId(url: string) {
  return (
    await new JsonRpcProvider({
      url,
      throttleLimit: 1,
      timeout: 3000
    }).getNetwork()
  ).chainId
}
