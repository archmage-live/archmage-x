import { WarningTwoIcon } from '@chakra-ui/icons'
import {
  Box,
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
import { BiQuestionMark } from '@react-icons/all-files/bi/BiQuestionMark'
import { FiCheckCircle } from '@react-icons/all-files/fi/FiCheckCircle'
import { FiCopy } from '@react-icons/all-files/fi/FiCopy'
import { MdOutlineSignalCellularConnectedNoInternet4Bar } from '@react-icons/all-files/md/MdOutlineSignalCellularConnectedNoInternet4Bar'
import Decimal from 'decimal.js'
import { useEffect } from 'react'
import { useNetworkState } from 'react-use'

import { useActive } from '~lib/active'
import { formatNumber } from '~lib/formatNumber'
import { WalletInfo } from '~lib/schema'
import { useConnectedSiteAccess } from '~lib/services/connectedSiteService'
import { useCryptoComparePrice } from '~lib/services/datasource/cryptocompare'
import { getNetworkInfo } from '~lib/services/network'
import { useBalance, useNetworkStatus } from '~lib/services/provider'
import { useCurrentSiteUrl } from '~lib/tab'
import { shortenAddress } from '~lib/utils'
import { KeylessOnboardPopover } from '~pages/KeylessOnboard/KeylessOnboardPopover'
import { useKeylessOnboardToast } from '~pages/KeylessOnboard/useKeylessOnboardToast'
import { ConnectedAccountsModal } from '~pages/Popup/Assets/ConnectedAccounts'
import { useDepositModal } from '~pages/Popup/Assets/Deposit'
import { useSendModal } from '~pages/Popup/Assets/Send'
import { ExportMnemonicModal } from '~pages/Settings/SettingsWallets/ExportMnemonicModal'

import { AccountMenu } from './AccountMenu'
import { TokenListSection } from './TokenList'

export default function Assets({ onLoaded }: { onLoaded?: () => void }) {
  const { network, account, wallet, subWallet } = useActive()

  const notBackedUp = (wallet?.info as WalletInfo)?.notBackedUp
  const {
    isOpen: isExportMnemonicOpen,
    onOpen: onExportMnemonicOpen,
    onClose: onExportMnemonicClose
  } = useDisclosure()

  const networkInfo = network && getNetworkInfo(network)

  const { online: isInternetOk } = useNetworkState()
  const isNetworkOk = useNetworkStatus(network, 15000)

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
    isOpen: isConnectedAccountsOpen,
    onOpen: onConnectedAccountsOpen,
    onClose: onConnectedAccountsClose
  } = useDisclosure()

  const { onOpen: onSendOpen } = useSendModal()
  const { onOpen: onDepositOpen } = useDepositModal()

  useKeylessOnboardToast(wallet, subWallet, network)

  return (
    <Stack w="full" px={4} pt={2} pb={4} spacing={8}>
      <Stack w="full" spacing={6}>
        <Stack w="full" spacing={4}>
          <Stack w="full" spacing={2}>
            <HStack justify="space-between" minH={16} position="relative">
              <HStack w={20} spacing={2} left="-4px" position="relative">
                <Box w={4}>
                  {(isInternetOk === false || isNetworkOk === false) && (
                    <Tooltip
                      label={
                        !isInternetOk
                          ? 'Network is offline'
                          : `Network ${networkInfo?.name} is unavailable`
                      }
                      placement="top-start">
                      <Box>
                        <Icon
                          as={MdOutlineSignalCellularConnectedNoInternet4Bar}
                          w="4"
                          h="4"
                          color="yellow.500"
                        />
                      </Box>
                    </Tooltip>
                  )}
                </Box>

                <Box w={4}>
                  {connected !== undefined && (
                    <Tooltip
                      label={
                        origin && !origin.startsWith('chrome')
                          ? (connected
                              ? 'Connected to '
                              : 'Not connected to ') + origin
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
                        onClick={onConnectedAccountsOpen}
                      />
                    </Tooltip>
                  )}
                </Box>

                <Box w={4}>
                  {notBackedUp && (
                    <Tooltip
                      label={`${wallet?.name} has not been backed up`}
                      placement="top-start">
                      <IconButton
                        variant="link"
                        minW={4}
                        aria-label="Back up secret recovery phrase"
                        icon={<WarningTwoIcon w="4" h="4" color="yellow.500" />}
                        onClick={onExportMnemonicOpen}
                      />
                    </Tooltip>
                  )}
                </Box>
              </HStack>

              <Tooltip
                closeOnClick={false}
                label={!hasCopied ? 'Copy Address' : 'Copied'}
                placement="top">
                <Button
                  variant="ghost"
                  size="lg"
                  h="70px"
                  maxW={56}
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

              <HStack w={20} spacing={2} justify="end">
                <KeylessOnboardPopover wallet={wallet} subWallet={subWallet} />

                <AccountMenu />
              </HStack>
            </HStack>

            <Divider />
          </Stack>

          <HStack justify="center" minH={16}>
            <Stack spacing={2} align="center">
              {price && (
                <Image
                  borderRadius="full"
                  boxSize="30px"
                  fit="cover"
                  src={price.imageUrl}
                  fallback={
                    <Center
                      w="30px"
                      h="30px"
                      borderRadius="full"
                      borderWidth="1px"
                      borderColor="gray.500">
                      <Icon as={BiQuestionMark} fontSize="3xl" />
                    </Center>
                  }
                  alt="Currency Logo"
                />
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
          <Button
            size="md"
            w={36}
            colorScheme={btnColorScheme}
            onClick={onDepositOpen}>
            Deposit
          </Button>
          <Button
            size="md"
            w={36}
            colorScheme={btnColorScheme}
            onClick={onSendOpen}>
            Send
          </Button>
        </HStack>
      </Stack>

      <TokenListSection />

      <ConnectedAccountsModal
        isOpen={isConnectedAccountsOpen}
        onClose={onConnectedAccountsClose}
      />

      {wallet && notBackedUp && (
        <ExportMnemonicModal
          walletId={wallet.id}
          notBackedUp={notBackedUp}
          isOpen={isExportMnemonicOpen}
          onClose={onExportMnemonicClose}
          size="full"
        />
      )}
    </Stack>
  )
}
