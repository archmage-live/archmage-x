import {
  Box,
  Button,
  Center,
  Divider,
  HStack,
  Icon,
  Image,
  Stack,
  Text
} from '@chakra-ui/react'
import { FaGlobeAmericas } from '@react-icons/all-files/fa/FaGlobeAmericas'
import * as React from 'react'
import { ReactNode } from 'react'

import { AlertBox } from '~components/AlertBox'
import { IToken, TokenVisibility } from '~lib/schema'
import {
  CONSENT_SERVICE,
  ConsentRequest,
  WatchAssetPayload
} from '~lib/services/consentService'
import { useCoinGeckoTokenPrice } from '~lib/services/datasource/coingecko'
import { getNetworkInfo, useNetwork } from '~lib/services/network'
import { useToken } from '~lib/services/token'
import { useChainAccount } from '~lib/services/wallet'
import { TokenItem, TokenItemStyle } from '~pages/Popup/Assets/TokenItem'
import { useSiteIconUrl } from "~lib/tab";

export const WatchAsset = ({
  request,
  onComplete,
  rejectAllButton
}: {
  request: ConsentRequest
  onComplete: () => void
  rejectAllButton: ReactNode
}) => {
  const iconUrl = useSiteIconUrl(request.origin)

  const {
    token: tokenAddr,
    info,
    balance
  } = request.payload as WatchAssetPayload

  const network = useNetwork(request.networkId)
  const account = useChainAccount(request.accountId as number)

  const networkInfo = network && getNetworkInfo(network)

  const token =
    account &&
    ({
      masterId: account.masterId,
      index: account.index,
      networkKind: account.networkKind,
      chainId: account.chainId,
      address: account.address,
      token: tokenAddr,
      visible: TokenVisibility.SHOW,
      info: { info, balance }
    } as IToken)

  const price = useCoinGeckoTokenPrice(network, tokenAddr)

  const existingToken = useToken(account, tokenAddr)

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
                Add Suggested Token
              </Text>
              <Text fontSize="sm">
                It will allow this token to be displayed within Archmage.
              </Text>
            </Stack>

            <Divider />

            {token && (
              <TokenItem
                token={token}
                style={TokenItemStyle.DISPLAY_WITH_PRICE}
                currencySymbol={price?.currencySymbol}
                price={price?.price}
                change24Hour={price?.change24Hour}
              />
            )}

            {existingToken?.visible === TokenVisibility.HIDE && (
              <AlertBox level="error">
                This token was blocked by you sometime ago. Only approve if you
                are certain that you mean to whitelist the token now.
              </AlertBox>
            )}
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
              onClick={async () => {
                await CONSENT_SERVICE.processRequest(request, true)
                onComplete()
              }}>
              Add Token
            </Button>
          </HStack>

          {rejectAllButton}
        </Stack>
      </Stack>
    </Box>
  )
}
