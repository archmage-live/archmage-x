import {
  Box,
  Button,
  Drawer,
  DrawerCloseButton,
  DrawerContent,
  DrawerOverlay,
  Flex,
  Image,
  Text,
  useColorModeValue,
  useDisclosure
} from '@chakra-ui/react'
import icon from 'data-base64:~assets/icon512.png'
import { useCallback } from 'react'

import { ToggleButton } from '~components/ToggleButton'
import { getNetworkInfo } from '~lib/services/network'

import { NetworkDrawer } from './NetworkDrawer'
import { WalletDrawer } from './WalletDrawer'
import { useSelectedNetwork } from './select'

export const Toolbar = () => {
  const { selectedNetwork } = useSelectedNetwork()
  const networkInfo = selectedNetwork && getNetworkInfo(selectedNetwork)

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
        <ToggleButton isOpen={isWalletOpen} onClick={onWalletToggle} />

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
