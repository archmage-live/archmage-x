import {
  Box,
  Button,
  Center,
  Drawer,
  DrawerCloseButton,
  DrawerContent,
  DrawerOverlay,
  Flex,
  HStack,
  Image,
  Text,
  useColorModeValue,
  useDisclosure
} from '@chakra-ui/react'
import icon from 'data-base64:~assets/icon512.png'
import { useCallback } from 'react'

import { AccountAvatar } from '~components/AccountAvatar'
import { ToggleButton } from '~components/ToggleButton'
import { useActive } from '~lib/active'
import { useEvmChainLogoUrl } from '~lib/services/datasource/chainlist'
import { getNetworkInfo } from '~lib/services/network'

import { NetworkDrawer } from './NetworkDrawer'
import { WalletDrawer } from './WalletDrawer'

export const Toolbar = () => {
  const { network, account } = useActive()

  const networkInfo = network && getNetworkInfo(network)
  const networkLogoUrl = useEvmChainLogoUrl(network?.chainId)

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

  return (
    <Box width="full" p="4" bg={bg} boxShadow={useColorModeValue('sm', 'sm')}>
      <Flex justify="space-between" align="center">
        <Box w="40px">
          <Image boxSize="24px" src={icon} alt="Logo" />
        </Box>

        <Button variant="outline" maxW={64} onClick={onNetworkToggle}>
          <HStack spacing={1}>
            <Image
              borderRadius="full"
              boxSize="20px"
              fit="cover"
              src={networkLogoUrl}
              fallback={<></>}
              alt="Currency Logo"
            />
            <Text noOfLines={1} display="block">
              {networkInfo?.name}
            </Text>
          </HStack>
        </Button>

        <Center w="40px" h="40px">
          <Box
            cursor="pointer"
            onClick={onWalletToggle}
            borderRadius="full"
            borderWidth="2px"
            borderColor="purple.500">
            <Box borderRadius="full" borderWidth="2px" borderColor={blockieBg}>
              <AccountAvatar text={account?.address || ''} />
            </Box>
          </Box>
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
