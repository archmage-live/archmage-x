import {
  Box,
  Button,
  Center,
  HStack,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Portal,
  Text,
  Tooltip
} from '@chakra-ui/react'
import { MdMoreVert } from 'react-icons/md'
import { VscDebugDisconnect } from 'react-icons/vsc'

import { AccountAvatar } from '~components/AccountAvatar'
import { INetwork } from '~lib/schema'
import { shortenAddress } from '~lib/utils'
import { SubWalletEntry } from '~pages/Popup/WalletDrawer/tree'

export const SubWalletItem = ({
  network,
  subWallet
}: {
  network: INetwork
  subWallet: SubWalletEntry
}) => {
  const { subWallet: wallet, account } = subWallet

  return (
    <Button
      key={wallet.id}
      variant="ghost"
      size="lg"
      w="full"
      h={16}
      px={4}
      justifyContent="start">
      <Box w="full">
        <HStack w="full" justify="space-between">
          <HStack w="calc(100% - 29.75px)" justify="space-between">
            <AccountAvatar
              text={account.address || ''}
              scale={0.8}
              m="-3px"
              mb="-16px"
            />

            <HStack
              w="calc(100% - 31px)"
              justify="space-between"
              align="baseline">
              <Text fontSize="lg" noOfLines={1} display="block">
                {wallet.name}
              </Text>

              <Text fontFamily="monospace" fontSize="sm" color="gray.500">
                {shortenAddress(account.address)}
              </Text>
            </HStack>
          </HStack>

          <Menu isLazy autoSelect={false} placement="left">
            <MenuButton
              variant="link"
              minW={0}
              as={IconButton}
              icon={<Icon as={MdMoreVert} fontSize="xl" />}
            />

            <Portal>
              <MenuList w={48}>
                <MenuItem
                  icon={<Icon as={VscDebugDisconnect} />}
                  iconSpacing={2}
                  onClick={() => {}}>
                  Disconnect
                </MenuItem>
              </MenuList>
            </Portal>
          </Menu>
        </HStack>

        <HStack w="calc(100% - 29.75px)" ps="32px">
          <ConnIndicator isConnected={true} isActive={true} />
        </HStack>
      </Box>
    </Button>
  )
}

export const ConnIndicator = ({
  isConnected,
  isActive
}: {
  isConnected: boolean
  isActive: boolean
}) => {
  return (
    <>
      <Tooltip
        label={isConnected ? 'Connected' : 'Not connected'}
        placement="top-start">
        {isConnected ? (
          <Center w={3} h={3} borderRadius="50%" bg={'green.500'} />
        ) : (
          <Center
            w={3}
            h={3}
            borderRadius="50%"
            borderWidth="2px"
            borderColor="red.500"
          />
        )}
      </Tooltip>

      {isActive && (
        <Tooltip label="Active" placement="top-start">
          <Center w={3} h={3} borderRadius="50%" bg={'blue.500'} />
        </Tooltip>
      )}

      {(!isConnected || !isActive) && (
        <Button variant="ghost" size="sm">
          {!isConnected ? 'Connect' : 'Switch'}
        </Button>
      )}
    </>
  )
}
