import {
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  HStack,
  Stack,
  useDisclosure
} from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { SaveInput } from '~components/SaveInput'
import { DB } from '~lib/db'
import { NetworkKind } from '~lib/network'
import { AptosChainInfo } from '~lib/network/aptos'
import { INetwork } from '~lib/schema'

import { DeleteNetworkModal } from '../DeleteNetworkModal'
import {
  getAptosBlockNumber,
  getAptosChainId
} from '../NetworkAdd/AptosNetworkAdd'
import {
  ExplorerUrlInputGroup,
  RpcUrlInputGroup
} from '../NetworkAdd/UrlInputGroup'

export const AptosNetworkEdit = ({
  network,
  info,
  setLoading,
  onDelete
}: {
  network: INetwork
  info: AptosChainInfo
  setLoading: (loading: boolean) => void
  onDelete: () => void
}) => {
  const [isChainIdInvalid, setIsChainIdInvalid] = useState(false)

  const [rpcUrls, _setRpcUrls] = useState<string[]>([])
  const [faucetUrls, _setFaucetUrls] = useState<string[]>([])

  const [isRpcUrlsChanged, setIsRpcUrlsChanged] = useState(false)
  const [isFaucetUrlsChanged, setIsFaucetUrlsChanged] = useState(false)

  const setRpcUrls = useCallback(
    (urls: string[]) => {
      setIsRpcUrlsChanged(
        !(
          urls.length === info.rpc.length &&
          urls.every((url, i) => url === info.rpc[i])
        )
      )
      _setRpcUrls(urls)
    },
    [info]
  )

  const setFaucetUrls = useCallback(
    (urls: string[]) => {
      setIsFaucetUrlsChanged(
        !(
          urls.length === (info.faucets?.length || 0) &&
          urls.every((url, i) => url === info.faucets?.[i])
        )
      )
      _setFaucetUrls(urls)
    },
    [info]
  )

  useEffect(() => {
    setRpcUrls(info.rpc)
    setFaucetUrls(info.faucets || [])
  }, [info, setRpcUrls, setFaucetUrls])

  const [allowInvalidRpcUrl, setAllowInvalidRpcUrl] = useState(false)

  const checkRpcUrls = useRef<() => Promise<string[] | undefined>>()
  const checkFaucetUrls = useRef<() => string[] | undefined>()

  const [isSaveRpcUrlsDisabled, setIsSaveRpcUrlsDisabled] = useState(false)
  const [isSaveFaucetUrlsDisabled, setIsSaveFaucetUrlsDisabled] =
    useState(false)

  useEffect(() => {
    setIsSaveRpcUrlsDisabled(false)
  }, [rpcUrls, allowInvalidRpcUrl])

  useEffect(() => {
    setIsSaveFaucetUrlsDisabled(false)
  }, [faucetUrls])

  const onSaveRpcUrls = useCallback(async () => {
    const checkedRpcUrls = await checkRpcUrls.current?.()
    if (!checkedRpcUrls) {
      setIsSaveRpcUrlsDisabled(true)
    } else {
      info.rpc = checkedRpcUrls
      await DB.networks.update(network, { info })
    }
    setLoading(false)
  }, [network, info, setLoading])

  const onSaveFaucetUrls = useCallback(async () => {
    const checkedFaucetUrls = checkFaucetUrls.current?.()
    if (!checkedFaucetUrls) {
      setIsSaveFaucetUrlsDisabled(true)
    } else {
      info.faucets = checkedFaucetUrls
      await DB.networks.update(network, { info })
    }
  }, [network, info])

  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose
  } = useDisclosure()

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
            return !!value && !isNaN(+value) && +value >= 0
          }}
          asyncValidate={async (value: string) => {
            return !(await DB.networks
              .where({ kind: NetworkKind.APTOS, chainId: +value })
              .first())
          }}
          onChange={(value: string) => {
            const chainId = +value
            info.chainId = chainId
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
          value={info.currency.symbol}
          validate={(value: string) => value.trim().slice(0, 16) || false}
          onChange={(value: string) => {
            info.currency.symbol = value
            DB.networks.update(network, { info })
          }}
        />
      </FormControl>

      <RpcUrlInputGroup
        urls={rpcUrls}
        setUrls={setRpcUrls}
        testUrl={getAptosBlockNumber}
        chainId={network.chainId}
        getChainId={getAptosChainId}
        checkUrls={checkRpcUrls}
        allowInvalidRpcUrl={allowInvalidRpcUrl}
        setAllowInvalidRpcUrl={setAllowInvalidRpcUrl}
        setLoading={setLoading}
        onSaveUrls={onSaveRpcUrls}
        isSaveDisabled={isSaveRpcUrlsDisabled}
        isUrlsChanged={isRpcUrlsChanged}
      />

      <ExplorerUrlInputGroup
        name="faucet"
        title="Faucet"
        urls={faucetUrls}
        setUrls={setFaucetUrls}
        checkUrls={checkFaucetUrls}
        onSaveUrls={onSaveFaucetUrls}
        isSaveDisabled={isSaveFaucetUrlsDisabled}
        isUrlsChanged={isFaucetUrlsChanged}
      />

      <HStack justify="end">
        <Button colorScheme="red" onClick={onDeleteOpen}>
          Delete Network
        </Button>
      </HStack>

      <DeleteNetworkModal
        network={network}
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        onDelete={onDelete}
      />
    </Stack>
  )
}
