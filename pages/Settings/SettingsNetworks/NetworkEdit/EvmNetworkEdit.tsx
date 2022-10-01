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
import { EvmChainInfo } from '~lib/network/evm'
import { INetwork } from '~lib/schema'
import { DeleteNetworkModal } from '~pages/Settings/SettingsNetworks/DeleteNetworkModal'
import {
  getBlockNumber,
  getChainId
} from '~pages/Settings/SettingsNetworks/NetworkAdd/EvmNetworkAdd'
import {
  ExplorerUrlInputGroup,
  RpcUrlInputGroup
} from '~pages/Settings/SettingsNetworks/NetworkAdd/UrlInputGroup'

export const EvmNetworkEdit = ({
  network,
  info,
  setLoading,
  onDelete
}: {
  network: INetwork
  info: EvmChainInfo
  setLoading: (loading: boolean) => void
  onDelete: () => void
}) => {
  const [isChainIdInvalid, setIsChainIdInvalid] = useState(false)

  const [rpcUrls, _setRpcUrls] = useState<string[]>([])
  const [explorerUrls, _setExplorerUrls] = useState<string[]>([])

  const [isRpcUrlsChanged, setIsRpcUrlsChanged] = useState(false)
  const [isExplorerUrlsChanged, setIsExplorerUrlsChanged] = useState(false)

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

  const setExplorerUrls = useCallback(
    (urls: string[]) => {
      setIsExplorerUrlsChanged(
        !(
          urls.length === info.explorers.length &&
          urls.every((url, i) => url === info.explorers[i].url)
        )
      )
      _setExplorerUrls(urls)
    },
    [info]
  )

  useEffect(() => {
    setRpcUrls(info.rpc)
    setExplorerUrls(info.explorers.map(({ url }) => url))
  }, [info, setRpcUrls, setExplorerUrls])

  const [allowInvalidRpcUrl, setAllowInvalidRpcUrl] = useState(false)

  const checkRpcUrls = useRef<() => Promise<string[] | undefined>>()
  const checkExplorerUrls = useRef<() => string[] | undefined>()

  const [isSaveRpcUrlsDisabled, setIsSaveRpcUrlsDisabled] = useState(false)
  const [isSaveExplorerUrlsDisabled, setIsSaveExplorerUrlsDisabled] =
    useState(false)

  useEffect(() => {
    setIsSaveRpcUrlsDisabled(false)
  }, [rpcUrls, allowInvalidRpcUrl])

  useEffect(() => {
    setIsSaveExplorerUrlsDisabled(false)
  }, [explorerUrls])

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

  const onSaveExplorerUrls = useCallback(async () => {
    const checkedExplorerUrls = checkExplorerUrls.current?.()
    if (!checkedExplorerUrls) {
      setIsSaveExplorerUrlsDisabled(true)
    } else {
      info.explorers = checkedExplorerUrls.map((url) => ({
        name: '',
        url,
        standard: 'EIP3091'
      }))
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

      <RpcUrlInputGroup
        urls={rpcUrls}
        setUrls={setRpcUrls}
        testUrl={getBlockNumber}
        chainId={network.chainId}
        getChainId={getChainId}
        checkUrls={checkRpcUrls}
        allowInvalidRpcUrl={allowInvalidRpcUrl}
        setAllowInvalidRpcUrl={setAllowInvalidRpcUrl}
        setLoading={setLoading}
        onSaveUrls={onSaveRpcUrls}
        isSaveDisabled={isSaveRpcUrlsDisabled}
        isUrlsChanged={isRpcUrlsChanged}
      />

      <ExplorerUrlInputGroup
        urls={explorerUrls}
        setUrls={setExplorerUrls}
        checkUrls={checkExplorerUrls}
        onSaveUrls={onSaveExplorerUrls}
        isSaveDisabled={isSaveExplorerUrlsDisabled}
        isUrlsChanged={isExplorerUrlsChanged}
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
