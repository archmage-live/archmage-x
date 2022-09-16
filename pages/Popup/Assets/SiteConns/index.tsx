import { ChevronDownIcon } from '@chakra-ui/icons'
import {
  Box,
  Center,
  Checkbox,
  Collapse,
  Divider,
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
import { useCallback, useEffect, useState } from 'react'
import { FaGlobeAmericas } from 'react-icons/fa'

import { useActive, useActiveNetwork, useActiveWallet } from '~lib/active'
import { IChainAccount, IConnectedSite, ISubWallet, IWallet } from '~lib/schema'
import { useConnectedSitesBySite } from '~lib/services/connectedSiteService'
import { useCurrentSiteUrl, useSiteIconUrl } from '~lib/util'
import {
  WalletEntry,
  isSameAccount,
  isSameSubWallet,
  isSameWallet,
  useReadonlyWalletTree
} from '~pages/Popup/WalletDrawer/tree'

import { WalletList } from './WalletList'

export const SiteConnsModal = ({
  isOpen,
  onClose
}: {
  isOpen: boolean
  onClose: () => void
}) => {
  const origin = useCurrentSiteUrl()?.origin

  const iconUrl = useSiteIconUrl(origin)

  const network = useActiveNetwork()

  const conns = useConnectedSitesBySite(origin)

  const entries = useReadonlyWalletTree()

  const { wallets, toggleOpen } = useWalletTreeByConns(entries, conns)

  const accountCount = wallets
    ? wallets.reduce((sum, entry) => sum + entry.subWallets.length, 0)
    : 0

  const { isOpen: isPermissionsOpen, onToggle: onPermissionsToggle } =
    useDisclosure()

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

            <Stack spacing={4}>
              <Divider />

              <Box w="full" minH="65px">
                {wallets && (
                  <WalletList
                    network={network}
                    wallets={wallets}
                    onToggleOpen={toggleOpen}
                  />
                )}
              </Box>

              <Divider />
            </Stack>

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
                <Box
                  w="full"
                  px={4}
                  py={2}
                  borderWidth="1px"
                  borderRadius="8px">
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
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export type ConnStatus = {
  isConnected: boolean
  isActive: boolean
}

export type Entry = {
  wallet: IWallet
  isOpen: boolean
  subWallets: SubEntry[]
}

export type SubEntry = {
  subWallet: ISubWallet
  account: IChainAccount
} & ConnStatus

function useWalletTreeByConns(
  wallets?: WalletEntry[],
  conns?: IConnectedSite[]
) {
  const [entries, setEntries] = useState<Entry[]>()

  const {
    wallet: currentWallet,
    subWallet: currentSubWallet,
    account: currentAccount
  } = useActive()

  useEffect(() => {
    if (!wallets || !conns) {
      setEntries(undefined)
      return
    }

    const connMap = new Map<number, Map<number, IConnectedSite>>()
    conns.forEach((conn) => {
      let map = connMap.get(conn.masterId)
      if (!map) {
        map = new Map()
        connMap.set(conn.masterId, map)
      }
      map.set(conn.index, conn)
    })

    let isCurrentConnected = false

    const entries: Entry[] = []
    for (const wallet of wallets) {
      if (!wallet.subWallets.length) {
        continue
      }
      const conns = connMap.get(wallet.wallet.id)
      if (!conns) {
        continue
      }

      const subEntries: SubEntry[] = []
      for (const subWallet of wallet.subWallets) {
        const conn = conns.get(subWallet.subWallet.index)
        if (!conn) {
          continue
        }

        if (
          currentSubWallet &&
          currentSubWallet.id === subWallet.subWallet.id
        ) {
          isCurrentConnected = true
        }

        subEntries.push({
          subWallet: subWallet.subWallet,
          account: subWallet.account,
          isConnected: true,
          isActive: false
        } as SubEntry)
      }

      if (!subEntries.length) {
        continue
      }

      entries.push({
        wallet: wallet.wallet,
        isOpen: false,
        subWallets: subEntries
      } as Entry)
    }

    if (entries.length && entries[0].subWallets.length) {
      entries[0].subWallets[0].isActive = true
    }

    if (
      !isCurrentConnected &&
      currentWallet &&
      currentSubWallet &&
      currentAccount
    ) {
      entries.unshift({
        wallet: currentWallet,
        isOpen: true,
        subWallets: [
          {
            subWallet: currentSubWallet,
            account: currentAccount,
            isConnected: false,
            isActive: false
          } as SubEntry
        ]
      } as Entry)
    }

    setEntries((oldEntries) => {
      const oldEntryMap = new Map(
        oldEntries?.map((entry) => [entry.wallet.id, entry])
      )

      let changed = entries.length !== oldEntries?.length

      const newEntries = entries.map((entry) => {
        const oldEntry = oldEntryMap.get(entry.wallet.id)
        if (!oldEntry) {
          changed = true
          return entry
        }

        const walletChanged = !isSameWallet(entry.wallet, oldEntry.wallet)

        const oldSubEntryMap = new Map(
          oldEntry.subWallets.map((entry) => [entry.subWallet.id, entry])
        )

        let subChanged = entry.subWallets.length !== oldEntry.subWallets.length

        const subEntries = entry.subWallets.map((subEntry) => {
          const oldSubEntry = oldSubEntryMap.get(subEntry.subWallet.id)
          if (
            oldSubEntry &&
            isSameSubWallet(subEntry.subWallet, oldSubEntry.subWallet) &&
            isSameAccount(subEntry.account, oldSubEntry.account) &&
            subEntry.isConnected === oldSubEntry.isConnected &&
            subEntry.isActive === oldSubEntry.isActive
          ) {
            return oldSubEntry
          }
          subChanged = true
          if (!oldSubEntry) {
            return subEntry
          }
          return {
            ...oldSubEntry,
            subWallet: subEntry.subWallet,
            account: subEntry.account
          } as SubEntry
        })

        if (walletChanged || subChanged) {
          changed = true
          return {
            ...oldEntry,
            wallet: walletChanged ? entry.wallet : oldEntry.wallet,
            subWallets: subChanged ? subEntries : oldEntry.subWallets
          } as Entry
        } else {
          return oldEntry
        }
      })

      console.log(
        `useWalletTreeByConns, get all entries: changed ${changed}, entries: ${
          newEntries.length
        }, sub entries: ${newEntries.reduce(
          (sum, entry) => sum + entry.subWallets.length,
          0
        )}`
      )
      return changed ? newEntries : oldEntries
    })
  }, [conns, currentAccount, currentSubWallet, currentWallet, wallets])

  const toggleOpen = useCallback(
    (id: number) => {
      setEntries((entries) => {
        if (!entries) {
          return entries
        }
        const wallets = entries.slice()
        for (const wallet of wallets) {
          if (wallet.wallet.id === id) {
            wallet.isOpen = !wallet.isOpen
            break
          }
        }
        return wallets
      })
    },
    [setEntries]
  )

  return {
    wallets: entries,
    toggleOpen
  }
}
