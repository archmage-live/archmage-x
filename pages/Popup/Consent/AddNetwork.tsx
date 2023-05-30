import {
  Box,
  Button,
  Divider,
  HStack,
  Icon,
  Image,
  Stack,
  Text
} from '@chakra-ui/react'
import { FaGlobeAmericas } from '@react-icons/all-files/fa/FaGlobeAmericas'
import { atom, useAtom } from 'jotai'
import { ReactNode, useEffect, useState } from 'react'

import { AlertBox } from '~components/AlertBox'
import { NetworkKind } from '~lib/network'
import { EvmChainInfo } from '~lib/network/evm'
import {
  AddNetworkPayload,
  CONSENT_SERVICE,
  ConsentRequest
} from '~lib/services/consentService'
import { getEvmBlockNumber } from '~lib/services/provider/evm'
import { useSiteIconUrl } from '~lib/tab'
import {
  ExplorerUrlInputGroup,
  RpcUrlInputGroup
} from '~pages/Settings/SettingsNetworks/NetworkAdd/UrlInputGroup'

export const AddNetwork = ({
  request,
  onComplete,
  rejectAllButton
}: {
  request: ConsentRequest
  onComplete: () => void
  rejectAllButton: ReactNode
}) => {
  const iconUrl = useSiteIconUrl(request.origin)

  const [info] = useAtom(infoAtom)

  return (
    <Box w="full" h="full" overflowY="auto">
      <Stack w="full" minH="full" p={8} spacing={8}>
        <HStack justify="center">
          <HStack
            borderWidth="1px"
            borderRadius="16px"
            px={4}
            py={2}
            maxW="full">
            <Image
              borderRadius="full"
              boxSize="25px"
              fit="cover"
              src={iconUrl}
              fallback={<Icon as={FaGlobeAmericas} fontSize="3xl" />}
              alt="Origin Icon"
            />
            <Text noOfLines={2}>{request.origin}</Text>
          </HStack>
        </HStack>

        <Stack textAlign="center">
          <Text fontSize="2xl" fontWeight="medium">
            Allow this site to add a network?
          </Text>
          <Text fontSize="sm">
            It will allow this network to be used within Archmage.
          </Text>
        </Stack>

        <AlertBox>Archmage does not verify custom networks.</AlertBox>

        <Divider />

        <NetworkContent request={request} />

        <Divider />

        <HStack justify="space-between">
          <Button
            size="lg"
            variant="outline"
            w={36}
            onClick={async () => {
              await CONSENT_SERVICE.processRequest(request, false)
              onComplete()
            }}>
            Cancel
          </Button>
          <Button
            size="lg"
            w={36}
            colorScheme="purple"
            onClick={async () => {
              if (!info) {
                return
              }
              const req = {
                ...request,
                payload: {
                  ...request.payload,
                  info
                } as AddNetworkPayload
              }
              await CONSENT_SERVICE.processRequest(req, true)
              onComplete()
            }}>
            Approve
          </Button>
        </HStack>

        {rejectAllButton}
      </Stack>
    </Box>
  )
}

const infoAtom = atom<any>(undefined)

const NetworkContent = ({ request }: { request: ConsentRequest }) => {
  const { networkKind, info } = request.payload as AddNetworkPayload

  switch (networkKind) {
    case NetworkKind.EVM:
      return <EvmNetworkContent info={info} />
  }

  return <></>
}

const EvmNetworkContent = ({ info }: { info: EvmChainInfo }) => {
  const [, setInfo] = useAtom(infoAtom)
  const [rpcUrls, setRpcUrls] = useState<string[]>([])
  const [explorerUrls, setExplorerUrls] = useState<string[]>([])

  useEffect(() => {
    setRpcUrls(info.rpc)
    setExplorerUrls(info.explorers.map(({ url }) => url))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info])

  useEffect(() => {
    setInfo({
      ...info,
      rpc: rpcUrls,
      explorers: explorerUrls.map((url) => ({
        name: '',
        url,
        standard: 'EIP3091'
      }))
    } as EvmChainInfo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info, rpcUrls, explorerUrls])

  return (
    <Stack spacing={12}>
      <Stack spacing={6}>
        <HStack spacing={4}>
          <Text fontWeight="medium">Network Name:</Text>
          <Text>{info.name}</Text>
        </HStack>

        <HStack spacing={4}>
          <Text fontWeight="medium">Chain ID:</Text>
          <Text>{info.chainId}</Text>
        </HStack>

        <HStack spacing={4}>
          <Text fontWeight="medium">Currency Symbol:</Text>
          <Text>{info.nativeCurrency.symbol}</Text>
        </HStack>
      </Stack>

      <RpcUrlInputGroup
        urls={rpcUrls}
        setUrls={setRpcUrls}
        noAdd
        noEdit
        testUrl={getEvmBlockNumber}
      />

      <ExplorerUrlInputGroup
        urls={explorerUrls}
        setUrls={setExplorerUrls}
        noAdd
        noEdit
        allowNoUrls={false}
      />
    </Stack>
  )
}
