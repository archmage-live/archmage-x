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
import { AptosClient } from 'aptos'
import { useCallback, useEffect, useRef, useState } from 'react'

import { AlertBox } from '~components/AlertBox'
import { NetworkKind } from '~lib/network'
import { AptosChainInfo } from '~lib/network/aptos'
import { ChainId } from '~lib/schema'
import { NETWORK_SERVICE } from '~lib/services/network'
import { stall } from '~lib/util'

import { ExplorerUrlInputGroup, RpcUrlInputGroup } from './UrlInputGroup'

export const AptosNetworkAdd = ({
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
  const [faucetUrls, setFaucetUrls] = useState<string[]>([''])

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
    faucetUrls,
    allowInvalidRpcUrl
  ])

  const checkRpcUrls = useRef<() => Promise<string[] | undefined>>()
  const checkFaucetUrls = useRef<() => string[] | undefined>()

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
          kind: NetworkKind.APTOS,
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

      const checkedFaucetUrls = checkFaucetUrls.current?.()
      if (!checkedFaucetUrls) {
        return
      }

      const checkedRpcUrls = await checkRpcUrls.current?.()
      if (!checkedRpcUrls) {
        setIsDisabled(true)
        return
      }

      const info = {
        name,
        chainId,
        rpc: checkedRpcUrls,
        faucets: checkedFaucetUrls,
        currency: {
          name: currencySymbol,
          symbol: currencySymbol,
          decimals: 8 // TODO
        }
      } as AptosChainInfo

      await onConfirm(NetworkKind.APTOS, chainId, info)
    }

    await Promise.all([confirm(), stall(500)])
    setLoading(false)
  }, [onConfirm, setLoading, name, chainIdStr, currencySymbol])

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
        testUrl={getAptosBlockNumber}
        chainId={chainIdStr ? +chainIdStr : undefined}
        getChainId={getAptosChainId}
        checkUrls={checkRpcUrls}
        allowInvalidRpcUrl={allowInvalidRpcUrl}
        setAllowInvalidRpcUrl={setAllowInvalidRpcUrl}
        setLoading={setLoading}
      />

      <ExplorerUrlInputGroup
        urls={faucetUrls}
        setUrls={setFaucetUrls}
        checkUrls={checkFaucetUrls}
      />

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

export async function getAptosBlockNumber(url: string) {
  const client = new AptosClient(url)
  const info = await client.getLedgerInfo()
  return +info.block_height
}

export async function getAptosChainId(url: string) {
  const client = new AptosClient(url)
  return client.getChainId()
}
