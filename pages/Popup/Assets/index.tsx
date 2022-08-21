import {
  Button,
  Center,
  HStack,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  Stack,
  Text,
  Tooltip,
  useClipboard
} from '@chakra-ui/react'
import { FiCheckCircle, FiCopy } from 'react-icons/fi'
import { MdMoreVert } from 'react-icons/md'

import {
  useConnectedSitesBySite,
  useConnectedSitesByWallet
} from '~lib/services/connectedSiteService'
import { useBalance } from '~lib/services/provider'
import { useWalletInfo } from '~lib/services/walletService'
import { useCurrentTab } from '~lib/util'
import { shortenAddress } from '~lib/utils'

import { useActiveWallet, useSelectedNetwork } from '../select'

export default function Assets() {
  const { wallet, subWallet } = useActiveWallet()
  const { selectedNetwork: network } = useSelectedNetwork()

  const info = useWalletInfo(
    wallet?.id,
    network?.kind,
    network?.chainId,
    subWallet?.index
  )

  const tab = useCurrentTab()
  const origin = tab?.url && new URL(tab.url).origin

  const conns = useConnectedSitesBySite()
  const connected =
    info &&
    conns &&
    conns.find(
      (conn) => conn.masterId === info.masterId && conn.index === info.index
    )

  const { hasCopied, onCopy } = useClipboard('')

  const balance = useBalance(network, info)

  return (
    <Stack w="full" pt={8} spacing={8}>
      <HStack justify="space-between" minH={16}>
        <Tooltip
          label={
            origin && !origin.startsWith('chrome')
              ? (connected ? 'Connected to ' : 'Not connected to ') + origin
              : ''
          }
          placement="top-start">
          <IconButton
            variant="ghost"
            aria-label="Show accounts connected to this site"
            icon={
              connected ? (
                <Center
                  w="4"
                  h="4"
                  borderRadius="50%"
                  bg={'green.500'}
                />
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

        <Tooltip label={!hasCopied ? 'Copy Address' : 'Copied'} placement="top">
          <Button
            variant="ghost"
            size="lg"
            h={16}
            colorScheme="purple"
            onClick={!hasCopied ? onCopy : undefined}>
            <Stack>
              <Text fontSize="lg">{subWallet?.name}</Text>
              <HStack color="gray.500" ps={5}>
                <Text fontSize="md">{shortenAddress(info?.address, 6)}</Text>
                <Icon w={3} h={3} as={!hasCopied ? FiCopy : FiCheckCircle} />
              </HStack>
            </Stack>
          </Button>
        </Tooltip>

        <Menu>
          <MenuButton
            variant="ghost"
            as={IconButton}
            icon={<Icon as={MdMoreVert} fontSize="xl" />}
          />
        </Menu>
      </HStack>

      <HStack justify="center" minH={16}>
        <Text fontSize="4xl" fontWeight="medium">
          {balance?.amount} {balance?.symbol}
        </Text>
      </HStack>

      <HStack justify="center" spacing={4}>
        <Button size="md" w={28}>
          Deposit
        </Button>
        <Button size="md" w={28}>
          Send
        </Button>
      </HStack>
    </Stack>
  )
}
