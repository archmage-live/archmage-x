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
  useColorModeValue
} from '@chakra-ui/react'
import Decimal from 'decimal.js'
import { useEffect } from 'react'
import { BiQuestionMark } from 'react-icons/bi'
import { FiCheckCircle, FiCopy } from 'react-icons/fi'

import { useActive } from '~lib/active'
import { formatNumber } from '~lib/formatNumber'
import { useConnectedSitesBySite } from '~lib/services/connectedSiteService'
import { useCryptoComparePrice } from '~lib/services/datasource/cryptocompare'
import { getNetworkInfo } from '~lib/services/network'
import { useBalance } from '~lib/services/provider'
import { useCurrentTab } from '~lib/util'
import { shortenAddress } from '~lib/utils'

import { AccountMenu } from './AccountMenu'
import { TokenListSection } from './TokenList'

export default function Assets({ onLoaded }: { onLoaded?: () => void }) {
  const { network, account, wallet, subWallet } = useActive()
  const networkInfo = network && getNetworkInfo(network)

  const tab = useCurrentTab()
  const origin = tab?.url && new URL(tab.url).origin

  const conns = useConnectedSitesBySite()
  const connected =
    account &&
    conns &&
    conns.find(
      (conn) =>
        conn.masterId === account.masterId && conn.index === account.index
    )

  const { hasCopied, onCopy } = useClipboard(account?.address ?? '')

  const balance = useBalance(network, account)
  const price = useCryptoComparePrice(balance?.symbol)

  useEffect(() => {
    if (balance) {
      setTimeout(() => {
        onLoaded?.()
      }, 100)
    }
  }, [balance, onLoaded])

  const btnColorScheme = useColorModeValue('purple', undefined)

  return (
    <Stack w="full" px={4} py={4} spacing={12}>
      <Stack w="full" spacing={8}>
        <Stack w="full" spacing={6}>
          <Stack w="full" spacing={4}>
            <HStack justify="space-between" minH={16}>
              <Tooltip
                label={
                  origin && !origin.startsWith('chrome')
                    ? (connected ? 'Connected to ' : 'Not connected to ') +
                      origin
                    : ''
                }
                placement="top-start">
                <IconButton
                  variant="ghost"
                  aria-label="Show accounts connected to this site"
                  icon={
                    connected ? (
                      <Center w="4" h="4" borderRadius="50%" bg={'green.500'} />
                    ) : (
                      <Center
                        w="4"
                        h="4"
                        borderRadius="50%"
                        borderWidth="2px"
                        borderColor="red.500"
                      />
                    )
                  }
                />
              </Tooltip>

              <Tooltip
                label={
                  !hasCopied ? (
                    <>
                      <Text>
                        {wallet?.name}
                        {subWallet?.name && ` / ${subWallet.name}`}
                      </Text>
                      <Text>
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
                  h={16}
                  maxW={64}
                  px={2}
                  colorScheme="purple"
                  onClick={onCopy}>
                  <Stack>
                    <HStack justify="center" fontSize="lg" spacing={1}>
                      <Text
                        noOfLines={1}
                        display="block"
                        maxW={subWallet?.name ? '98px' : '196px'}>
                        {wallet?.name}
                      </Text>
                      {subWallet?.name && (
                        <>
                          <Text>/</Text>
                          <Text noOfLines={1} display="block" maxW="98px">
                            {subWallet.name}
                          </Text>
                        </>
                      )}
                    </HStack>
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

              <AccountMenu />
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
    </Stack>
  )
}
