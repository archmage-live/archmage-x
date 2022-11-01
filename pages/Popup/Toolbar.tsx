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
import icon from 'data-base64:~assets/archmage.svg'
import { useCallback, useState } from 'react'

import { AccountAvatar } from '~components/AccountAvatar'
import { WalletId, useActive } from '~lib/active'
import { getNetworkInfo, useNetworkLogoUrl } from '~lib/services/network'
import {
  WalletEntry,
  filterWalletTreeBySearch,
  useWalletTree
} from '~lib/services/wallet/tree'
import { WrappedDeleteWalletModal } from '~pages/Settings/SettingsWallets/DeleteWalletModal'

import { NetworkDrawer } from './NetworkDrawer'
import { WalletDrawer } from './WalletDrawer'

export const Toolbar = () => {
  const { network, account } = useActive()

  const networkInfo = network && getNetworkInfo(network)
  const networkLogoUrl = useNetworkLogoUrl(network)

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

  const [search, setSearch] = useState('')

  const filter = useCallback(
    (entries: WalletEntry[]) => {
      return filterWalletTreeBySearch(entries, search)
    },
    [search]
  )

  const { wallets, toggleOpen, setSelected } = useWalletTree<WalletId>(
    network,
    filter,
    true
  )

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
              fallback={<></>}
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
            {isNetworkOpen && <NetworkDrawer onClose={onClose} />}
            {isWalletOpen && (
              <WalletDrawer
                network={network}
                wallets={wallets}
                toggleOpen={toggleOpen}
                setSelected={setSelected}
                setSearch={setSearch}
                onClose={onClose}
              />
            )}
          </DrawerContent>
        </Drawer>
      </HStack>

      <WrappedDeleteWalletModal />
    </Box>
  )
}
