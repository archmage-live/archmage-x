import {
  Box,
  Button,
  Center,
  Drawer,
  DrawerCloseButton,
  DrawerContent,
  DrawerOverlay,
  Flex,
  IconButton,
  Image,
  Text,
  useColorModeValue,
  useDisclosure
} from '@chakra-ui/react'
import icon from 'data-base64:~assets/icon512.png'
import { useCallback } from 'react'
import Blockies from 'react-blockies'

import { ToggleButton } from '~components/ToggleButton'
import { getNetworkInfo } from '~lib/services/network'
import { useChainAccount } from '~lib/services/walletService'

import { NetworkDrawer } from './NetworkDrawer'
import { WalletDrawer } from './WalletDrawer'
import { useActiveWallet, useSelectedNetwork } from './select'

export const Toolbar = () => {
  const { selectedNetwork: network } = useSelectedNetwork()
  const networkInfo = network && getNetworkInfo(network)

  const { wallet, subWallet } = useActiveWallet()
  const account = useChainAccount(
    wallet?.id,
    network?.kind,
    network?.chainId,
    subWallet?.index
  )

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

  return (
    <Box width="full" p="4" boxShadow={useColorModeValue('sm', 'sm')}>
      <Flex justify="space-between" align="center">
        <Image boxSize="24px" src={icon} alt="Logo" />
        <Button variant="outline" maxW={44} onClick={onNetworkToggle}>
          <Text noOfLines={1} display="block">
            {networkInfo?.name}
          </Text>
        </Button>
        <Center w="40px" h="40px">
          {account && (
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
                <Box borderRadius="full" overflow="hidden">
                  <Blockies seed={account.address} size={10} scale={3} />
                </Box>
              </Box>
            </Box>
          )}
        </Center>
        {/*<ToggleButton isOpen={isWalletOpen} onClick={onWalletToggle} />*/}

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
            {isWalletOpen && <WalletDrawer onClose={onClose} />}
          </DrawerContent>
        </Drawer>
      </Flex>
    </Box>
  )
}
