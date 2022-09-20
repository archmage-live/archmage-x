import {
  Button,
  Center,
  Divider,
  HStack,
  Icon,
  IconButton,
  Image,
  Stack,
  Text,
  Tooltip,
  useClipboard,
  useColorModeValue,
  useDisclosure
} from '@chakra-ui/react'
import Decimal from 'decimal.js'
import { useEffect } from 'react'
import { BiQuestionMark } from 'react-icons/bi'
import { FiCheckCircle, FiCopy } from 'react-icons/fi'

import { useActive } from '~lib/active'
import { formatNumber } from '~lib/formatNumber'
import { useConnectedSiteAccess } from '~lib/services/connectedSiteService'
import { useCryptoComparePrice } from '~lib/services/datasource/cryptocompare'
import { getNetworkInfo } from '~lib/services/network'
import { useBalance } from '~lib/services/provider'
import { useCurrentSiteUrl } from '~lib/util'
import { shortenAddress } from '~lib/utils'
import { SiteConnsModal } from '~pages/Popup/Assets/SiteConns'

import { AccountMenu } from './AccountMenu'
import { TokenListSection } from './TokenList'

export default function Assets({ onLoaded }: { onLoaded?: () => void }) {
  const { network, account, wallet, subWallet } = useActive()
  const networkInfo = network && getNetworkInfo(network)

  const origin = useCurrentSiteUrl()?.origin

  const conn = useConnectedSiteAccess(account, origin)
  const connected = conn !== undefined ? !!conn : undefined

  const { hasCopied, onCopy } = useClipboard(account?.address ?? '')

  const balance = useBalance(network, account)
  const price = useCryptoComparePrice(balance?.symbol)

  useEffect(() => {
    setTimeout(() => {
      onLoaded?.()
    }, 3000)
    if (balance && price) {
      setTimeout(() => {
        onLoaded?.()
      }, 100)
    }
  }, [balance, price, onLoaded])

  const btnColorScheme = useColorModeValue('purple', undefined)

  const {
    isOpen: isConnsOpen,
    onOpen: onConnsOpen,
    onClose: onConnsClose
  } = useDisclosure()

  return (
    <Stack w="full" px={4} py={4} spacing={12}>
      <Stack w="full" spacing={8}>
        <Stack w="full" spacing={6}>
          <Stack w="full" spacing={4}>
            <HStack justify="space-between" minH={16}>
              <Center w="24px">
                {connected !== undefined && (
                  <Tooltip
                    label={
                      origin && !origin.startsWith('chrome')
                        ? (connected ? 'Connected to ' : 'Not connected to ') +
                          origin
                        : ''
                    }
                    placement="top-start">
                    <IconButton
                      variant="link"
                      minW={4}
                      aria-label="Show accounts connected to this site"
                      icon={
                        connected ? (
                          <Center
                            w="4"
                            h="4"
                            borderRadius="50%"
                            bg={'green.500'}
                            _hover={{ bg: 'green.600' }}
                            transition="background 0.2s ease-out"
                          />
                        ) : (
                          <Center
                            w="4"
                            h="4"
                            borderRadius="50%"
                            borderWidth="2px"
                            borderColor="red.500"
                            _hover={{ borderColor: 'red.600' }}
                            transition="border-color 0.2s ease-out"
                          />
                        )
                      }
                      onClick={onConnsOpen}
                    />
                  </Tooltip>
                )}
              </Center>

              <Tooltip
                closeOnClick={false}
                label={
                  !hasCopied ? (
                    <>
                      <Text textAlign="center">
                        {wallet?.name}
                        {subWallet?.name && ` / ${subWallet.name}`}
                      </Text>
                      <Text textAlign="center">
                        {account?.address
                          ? account.address
                          : `Not Available for network ${networkInfo?.name}`}
                      </Text>
                    </>
                  ) : (
                    'Copied Address'
                  )
                }
                placement="top">
                <Button
                  variant="ghost"
                  size="lg"
                  h="70px"
                  maxW={64}
                  px={2}
                  colorScheme="purple"
                  onClick={onCopy}>
                  <Stack align="center">
                    <Stack align="center" spacing={1}>
                      {subWallet?.name && (
                        <Text
                          fontSize="xs"
                          transform="scale(0.9)"
                          color="gray.500"
                          noOfLines={1}
                          display="block"
                          maxW="196px">
                          {wallet?.name}
                        </Text>
                      )}
                      <Text
                        fontSize="lg"
                        noOfLines={1}
                        display="block"
                        maxW="196px">
                        {subWallet?.name || wallet?.name}
                      </Text>
                    </Stack>
                    <HStack justify="center" color="gray.500" ps={5}>
                      <Text fontSize="md">
                        {shortenAddress(account?.address)}
                      </Text>
                      <Icon
                        w={3}
                        h={3}
                        as={!hasCopied ? FiCopy : FiCheckCircle}
                      />
                    </HStack>
                  </Stack>
                </Button>
              </Tooltip>

              <HStack w="24px" justify="end">
                <AccountMenu />
              </HStack>
            </HStack>

            <Divider />
          </Stack>

          <HStack justify="center" minH={16}>
            <Stack spacing={2} align="center">
              {price && (
                <Center w="35px" h="35px" borderRadius="full" borderWidth="1px">
                  <Image
                    borderRadius="full"
                    boxSize="30px"
                    fit="cover"
                    src={price.imageUrl}
                    fallback={<Icon as={BiQuestionMark} fontSize="3xl" />}
                    alt="Currency Logo"
                  />
                </Center>
              )}

              <Stack spacing={0} align="center">
                <Text fontSize="4xl" fontWeight="medium">
                  {formatNumber(balance?.amount)} {balance?.symbol}
                </Text>
                {price && (
                  <>
                    <Text fontSize="xl" fontWeight="medium" color="gray.500">
                      {price.currencySymbol}&nbsp;
                      {formatNumber(
                        new Decimal(price.price || 0).mul(balance?.amount || 0)
                      )}
                    </Text>
                    {price.change24Hour !== undefined && (
                      <HStack
                        spacing={3}
                        fontWeight="medium"
                        fontSize="md"
                        color={
                          price.change24Hour >= 0 ? 'green.500' : 'red.500'
                        }>
                        <Text color="gray.500">{price.displayPrice}</Text>
                        <Text>
                          {price.change24Hour >= 0 && '+'}
                          {price.displayChange24Hour}
                        </Text>
                        <Text>
                          {price.change24Hour >= 0 && '+'}
                          {price.displayChangePercent24Hour}%
                        </Text>
                      </HStack>
                    )}
                  </>
                )}
              </Stack>
            </Stack>
          </HStack>
        </Stack>

        <HStack justify="center" spacing={4}>
          <Button size="md" w={36} colorScheme={btnColorScheme}>
            Deposit
          </Button>
          <Button size="md" w={36} colorScheme={btnColorScheme}>
            Send
          </Button>
        </HStack>
      </Stack>

      <TokenListSection />

      <SiteConnsModal isOpen={isConnsOpen} onClose={onConnsClose} />
    </Stack>
  )
}
