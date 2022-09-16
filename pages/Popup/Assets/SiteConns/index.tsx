import { ChevronDownIcon } from '@chakra-ui/icons'
import {
  Box,
  Center,
  Checkbox,
  Collapse,
  HStack,
  Icon,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Stack,
  Text,
  useDisclosure
} from '@chakra-ui/react'
import { useCallback } from 'react'
import { FaGlobeAmericas } from 'react-icons/fa'

import { useActiveNetwork } from '~lib/active'
import { IChainAccount, INetwork, ISubWallet, SubIndex } from '~lib/schema'
import { CONNECTED_SITE_SERVICE } from '~lib/services/connectedSiteService'
import { WALLET_SERVICE } from '~lib/services/walletService'
import { useCurrentSiteUrl, useSiteIconUrl } from '~lib/util'
import {
  SubWalletEntry,
  WalletEntry,
  useWalletTree
} from '~pages/Popup/WalletDrawer/tree'

import { WalletList } from './WalletList'

export const SiteConnsModal = ({
  isOpen,
  onClose
}: {
  isOpen: boolean
  onClose: () => void
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      scrollBehavior="inside"
      size="lg">
      <ModalOverlay />
      <ModalContent maxH="100%" my={0}>
        <ModalCloseButton />
        <ModalBody p={0}>
          <SiteConns />
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

const SiteConns = ({}: {}) => {
  const origin = useCurrentSiteUrl()?.origin

  const iconUrl = useSiteIconUrl(origin)

  const { network } = useActiveNetwork()

  const fetchWallets = useCallback(
    (network: INetwork) => {
      return fetchWalletsByConns(network, origin)
    },
    [origin]
  )
  const { wallets, toggleOpen } = useWalletTree(network, fetchWallets)

  const accountCount = wallets
    ? wallets.reduce((sum, entry) => sum + entry.subWallets.length, 0)
    : 0

  const { isOpen: isPermissionsOpen, onToggle: onPermissionsToggle } =
    useDisclosure()

  return (
    <Stack px={4} pt={4} pb={6} spacing={6}>
      <Stack>
        <HStack maxW="full">
          <Image
            borderRadius="full"
            boxSize="25px"
            fit="cover"
            src={iconUrl}
            fallback={<Icon as={FaGlobeAmericas} fontSize="3xl" />}
            alt="Origin Icon"
          />
          <Text fontSize="lg" fontWeight="medium" noOfLines={2}>
            {origin && new URL(origin).host}
          </Text>
        </HStack>

        <Text color="gray.500" fontSize="sm">
          You have {accountCount} account(s) connected to this site.
        </Text>
      </Stack>

      <Box w="full" borderWidth="1px" borderRadius="8px" minH={24}>
        {wallets && (
          <WalletList
            network={network}
            wallets={wallets}
            onToggleOpen={toggleOpen}
          />
        )}
      </Box>

      <Stack w="full" spacing={0}>
        <HStack
          h={12}
          justify="space-between"
          cursor="pointer"
          onClick={onPermissionsToggle}>
          <Text fontWeight="medium">Permissions</Text>

          <Text fontSize="3xl" color="gray.500">
            <ChevronDownIcon
              transition="all 0.2s ease-out"
              transform={isPermissionsOpen ? 'rotate(180deg)' : undefined}
            />
          </Text>
        </HStack>

        <Collapse in={isPermissionsOpen} animateOpacity>
          <Box w="full" px={4} py={2} borderWidth="1px" borderRadius="8px">
            <Stack color="gray.500">
              <Text>You have authorized the following permissions:</Text>
              <HStack>
                <Checkbox isDisabled defaultChecked color="black" />
                <Text>
                  See address, account balance, activity and suggest
                  transactions to approve
                </Text>
              </HStack>
            </Stack>
          </Box>
        </Collapse>
      </Stack>
    </Stack>
  )
}

async function fetchWalletsByConns(
  network: INetwork,
  origin?: string
): Promise<WalletEntry[]> {
  if (!origin) {
    return []
  }
  const conns = await CONNECTED_SITE_SERVICE.getConnectedSitesBySite(origin)
  const wallets = await WALLET_SERVICE.getWallets(
    Array.from(new Set(conns.map((conn) => conn.masterId)))
  )
  const subWallets = await WALLET_SERVICE.getSubWallets(
    conns.map(
      ({ masterId, index }) =>
        ({
          masterId,
          index
        } as SubIndex)
    )
  )
  const accounts = await WALLET_SERVICE.getChainAccounts(
    conns.map(({ masterId, index }) => ({
      masterId,
      index,
      networkKind: network.kind,
      chainId: network.chainId
    }))
  )

  const subWalletMap = new Map<number, ISubWallet[]>()
  subWallets.forEach((subWallet) => {
    let array = subWalletMap.get(subWallet.masterId)
    if (!array) {
      array = []
      subWalletMap.set(subWallet.masterId, array)
    }
    array.push(subWallet)
  })

  const accountMap = new Map<number, Map<number, IChainAccount>>()
  accounts.forEach((account) => {
    let map = accountMap.get(account.masterId)
    if (!map) {
      map = new Map()
      accountMap.set(account.masterId, map)
    }
    map.set(account.index, account)
  })

  return wallets
    .map((wallet) => {
      const subWallets = subWalletMap.get(wallet.id)
      const accounts = accountMap.get(wallet.id)

      return {
        wallet,
        subWallets: subWallets
          ?.map((subWallet) => {
            return {
              subWallet,
              account: accounts?.get(subWallet.index)
            } as SubWalletEntry
          })
          .filter((subEntry) => subEntry.subWallet && subEntry.account)
      } as WalletEntry
    })
    .filter((entry) => entry.subWallets.length)
}
