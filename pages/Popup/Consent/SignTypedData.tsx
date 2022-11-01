import {
  Box,
  Button,
  Center,
  Divider,
  HStack,
  Icon,
  Image,
  Stack,
  Text,
  useColorModeValue
} from '@chakra-ui/react'
import * as React from 'react'
import { ReactNode, useCallback, useState } from 'react'
import { FaGlobeAmericas } from 'react-icons/fa'
import ReactJson from 'react-json-view'

import {
  CONSENT_SERVICE,
  ConsentRequest,
  SignTypedDataPayload
} from '~lib/services/consentService'
import { getNetworkInfo, useNetwork } from '~lib/services/network'
import {
  useChainAccount,
  useSubWalletByIndex,
  useWallet
} from '~lib/services/wallet'
import { useSiteIconUrl } from '~lib/util'
import { isWalletConnectProtocol } from '~lib/wallet'
import {
  WalletConnectSigningModel,
  useWalletConnectSigning
} from '~pages/Popup/Consent/WallectConnectSigningModel'

export const SignTypedData = ({
  request,
  onComplete,
  rejectAllButton
}: {
  request: ConsentRequest
  onComplete: () => void
  rejectAllButton: ReactNode
}) => {
  const iconUrl = useSiteIconUrl(request.origin)

  const network = useNetwork(request.networkId)
  const account = useChainAccount(request.accountId as number)
  const wallet = useWallet(account?.masterId)
  const subWallet = useSubWalletByIndex(account?.masterId, account?.index)

  const networkInfo = network && getNetworkInfo(network)

  const payload = request.payload as SignTypedDataPayload
  const { metadata, typedData } = payload
  const { domain, types, primaryType, message } = typedData

  const rjvTheme = useColorModeValue('rjv-default', 'brewer')
  const rjvBg = useColorModeValue('gray.50', 'rgb(12, 13, 14)')

  const [isLoading, setIsLoading] = useState(false)

  const {
    isWcOpen,
    onWcOpen,
    onWcClose,
    wcPayload,
    setWcPayload,
    onWcSignedRef
  } = useWalletConnectSigning()

  const onConfirm = useCallback(async () => {
    const process = async (signature?: any) => {
      setIsLoading(true)
      if (signature) {
        payload.signature = signature
      }
      await CONSENT_SERVICE.processRequest(request, true)
      onComplete()
      setIsLoading(false)
    }

    if (wallet && isWalletConnectProtocol(wallet.type)) {
      setWcPayload({ typedData: payload.originalTypedData })
      onWcSignedRef.current = ({ signature }) => {
        console.log(signature)
        process(signature)
      }
      onWcOpen()
    } else {
      await process()
    }
  }, [
    onComplete,
    onWcOpen,
    onWcSignedRef,
    request,
    setWcPayload,
    payload,
    wallet
  ])

  return (
    <Box w="full" h="full" overflowY="auto">
      <Stack w="full" minH="full" spacing={8} justify="space-between">
        <Stack spacing={4}>
          <Stack>
            <Center pt={2} px={6}>
              <Box px={2} py={1} borderRadius="8px" borderWidth="1px">
                <Text noOfLines={1} display="block" fontSize="sm">
                  {networkInfo?.name}
                </Text>
              </Box>
            </Center>

            <Divider />
          </Stack>

          <Stack spacing={8} px={8}>
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
                Signing Request for Typed Data
              </Text>
            </Stack>

            <Divider />

            <Stack>
              {metadata
                .filter(([, value]) => !!value)
                .map(([name, value]) => {
                  return (
                    <HStack key={name} spacing={8} justify="space-between">
                      <Text fontWeight="medium">{name}:</Text>
                      <Text noOfLines={2}>{value}</Text>
                    </HStack>
                  )
                })}
            </Stack>

            <Stack>
              <Text fontWeight="medium">Message:</Text>

              <Box
                maxH="full"
                w="full"
                px={4}
                py={2}
                overflow="auto"
                borderRadius="8px"
                borderWidth="1px"
                borderColor="gray.500"
                bg={rjvBg}>
                <ReactJson
                  src={message}
                  name={false}
                  theme={rjvTheme}
                  iconStyle="triangle"
                  collapsed={2}
                  enableClipboard={false}
                  displayDataTypes={false}
                  displayArrayKey={false}
                />
              </Box>
            </Stack>
          </Stack>
        </Stack>

        <Stack spacing={8} px={8} pb={8}>
          <HStack justify="space-between">
            <Button
              size="lg"
              variant="outline"
              w={40}
              onClick={async () => {
                await CONSENT_SERVICE.processRequest(request, false)
                onComplete()
              }}>
              Cancel
            </Button>
            <Button
              size="lg"
              w={40}
              colorScheme="purple"
              isLoading={isLoading}
              onClick={onConfirm}>
              Sign
            </Button>
          </HStack>

          {rejectAllButton}
        </Stack>
      </Stack>

      {network && wallet && account && isWalletConnectProtocol(wallet.type) && (
        <WalletConnectSigningModel
          isOpen={isWcOpen}
          onClose={onWcClose}
          network={network}
          account={account}
          payload={wcPayload}
          onSigned={onWcSignedRef.current}
        />
      )}
    </Box>
  )
}

declare module 'react-json-view' {
  export interface ReactJsonViewProps {
    displayArrayKey: boolean
  }
}
