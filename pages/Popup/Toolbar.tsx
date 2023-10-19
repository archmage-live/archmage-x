import {
  Box,
  Button,
  Center,
  Drawer,
  DrawerCloseButton,
  DrawerContent,
  DrawerOverlay,
  HStack,
  Image,
  Text,
  useColorModeValue,
  useDisclosure
} from '@chakra-ui/react'
import Avvvatars from 'avvvatars-react'
import icon from 'data-base64:~assets/archmage.svg'
import { useCallback, useState } from 'react'

import { useNetworkTreeState } from '~/lib/hooks/useNetworkTreeState'
import { AccountAvatar } from '~components/AccountAvatar'
import { WrappedDeleteWalletModal } from '~components/DeleteWalletModal'
import { WalletId, useActive } from '~lib/active'
import { useWalletTreeState } from '~lib/hooks/useWalletTreeState'
import {
  getNetworkInfo,
  useNetworkLogoUrl,
  useNetworkLogos,
  useNetworks
} from '~lib/services/network'
import {
  WalletEntry,
  filterWalletTreeBySearch,
  useWalletTree
} from '~lib/services/wallet/tree'

import { NetworkDrawer } from './NetworkDrawer'
import { WalletDrawer } from './WalletDrawer'

export const Toolbar = () => {
  const { network, account } = useActive()

  const networkInfo = network && getNetworkInfo(network)
  const networkLogoUrl = useNetworkLogoUrl(network)

  const networkLogos = useNetworkLogos()

  const bg = useColorModeValue('gray.50', 'blackAlpha.400')
  const blockieBg = useColorModeValue('purple.50', 'gray.800')

  const {
    isOpen: isNetworkOpen,
    onToggle: onNetworkToggle,
    onClose: onNetworkClose
  } = useDisclosure()
  const {
    isOpen: isWalletOpen,
    onToggle: onWalletToggle,
    onClose: onWalletClose
  } = useDisclosure()

  const onClose = useCallback(() => {
    onNetworkClose()
    onWalletClose()
  }, [onNetworkClose, onWalletClose])

  const networks = useNetworks()

  const [search, setSearch] = useState('')

  const filter = useCallback(
    (entries: WalletEntry[]) => {
      return filterWalletTreeBySearch(entries, search)
    },
    [search]
  )

  const { wallets, setSelected } = useWalletTree<WalletId>(
    network,
    filter,
    true
  )

  const {
    state: walletTreeState,
    setScrollOffset: setWalletScrollOffset,
    setSubScrollOffset: setSubWalletScrollOffset,
    toggleOpen: toggleWalletOpen
  } = useWalletTreeState(true)

  const { setScrollOffset: setNetworkScrollOffset } = useNetworkTreeState()

  return (
    <Box width="full" p="4" bg={bg} boxShadow={useColorModeValue('sm', 'sm')}>
      <HStack justify="space-between">
        <Box w="48px">
          <Image boxSize="48px" my="-4px" src={icon} alt="Logo" />
        </Box>

        <Button variant="outline" minW={32} maxW={64} onClick={onNetworkToggle}>
          <HStack>
            <Image
              borderRadius="full"
              boxSize="20px"
              fit="cover"
              src={networkLogoUrl}
              fallback={
                networkInfo ? (
                  <Avvvatars
                    value={networkInfo.name}
                    displayValue={
                      networkInfo.name ? networkInfo.name[0] : undefined
                    }
                    size={20}
                  />
                ) : (
                  <Box w="20px" />
                )
              }
              alt="Network Logo"
            />
            <Text noOfLines={1} display="block">
              {networkInfo?.name}
            </Text>
          </HStack>
        </Button>

        <HStack w="48px" justify="end">
          <Center w="40px" h="40px">
            <Box
              cursor="pointer"
              onClick={onWalletToggle}
              borderRadius="full"
              borderWidth="2px"
              borderColor="purple.500">
              <Box
                borderRadius="full"
                borderWidth="2px"
                borderColor={blockieBg}>
                <AccountAvatar text={account?.address || ''} />
              </Box>
            </Box>
          </Center>
        </HStack>

        <Drawer
          isOpen={isNetworkOpen || isWalletOpen}
          size="xs"
          placement="right"
          onClose={onClose}
          isFullHeight
          preserveScrollBarGap>
          <DrawerOverlay />
          <DrawerContent>
            <DrawerCloseButton />
            {isNetworkOpen && (
              <NetworkDrawer
                networks={networks}
                networkLogos={networkLogos}
                onClose={onClose}
                setScrollOffset={setNetworkScrollOffset}
              />
            )}
            {isWalletOpen && (
              <WalletDrawer
                network={network}
                wallets={wallets}
                openState={walletTreeState.isOpen}
                toggleOpen={toggleWalletOpen}
                setSelected={setSelected}
                setSearch={setSearch}
                onClose={onClose}
                setScrollOffset={setWalletScrollOffset}
                setSubScrollOffset={setSubWalletScrollOffset}
              />
            )}
          </DrawerContent>
        </Drawer>
      </HStack>

      <WrappedDeleteWalletModal />
    </Box>
  )
}
