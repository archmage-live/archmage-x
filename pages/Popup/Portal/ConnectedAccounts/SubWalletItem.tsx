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
  Text,
  Tooltip
} from '@chakra-ui/react'
import { MdMoreVert } from '@react-icons/all-files/md/MdMoreVert'
import { VscDebugDisconnect } from '@react-icons/all-files/vsc/VscDebugDisconnect'

import { AccountAvatar } from '~components/AccountAvatar'
import { setActiveWallet } from '~lib/active'
import { INetwork } from '~lib/schema'
import { CONNECTED_SITE_SERVICE } from '~lib/services/connectedSiteService'
import { getCurrentTab } from '~lib/tab'
import { shortenString } from '~lib/utils'

import { SubEntry } from '.'

export const SubWalletItem = ({
  network,
  subWallet
}: {
  network: INetwork
  subWallet: SubEntry
}) => {
  const { subWallet: wallet, account } = subWallet

  return (
    <Button
      key={wallet.id}
      as="div"
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

              <Text
                sx={{ fontFeatureSettings: '"tnum"' }}
                fontSize="sm"
                color="gray.500">
                {shortenString(account.address)}
              </Text>
            </HStack>
          </HStack>

          {subWallet.isConnected && <ConnMenu subWallet={subWallet} />}
        </HStack>

        <HStack w="calc(100% - 29.75px)" ps="32px">
          <ConnIndicator subWallet={subWallet} />
        </HStack>
      </Box>
    </Button>
  )
}

export const ConnIndicator = ({
  subWallet: { subWallet, account, isConnected, isActive, isCurrent }
}: {
  subWallet: Partial<SubEntry>
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

      {subWallet && account && (!isConnected || !isCurrent) && (
        <Button
          variant="ghost"
          colorScheme="purple"
          size="xs"
          onClick={async () => {
            if (!isConnected) {
              const tab = await getCurrentTab()
              if (tab?.url) {
                await CONNECTED_SITE_SERVICE.connectSite(account, tab.url)
              }
            } else {
              await setActiveWallet({
                id: subWallet.masterId,
                subId: subWallet.id
              })
            }
          }}>
          {!isConnected ? 'Connect' : 'Switch'}
        </Button>
      )}
    </>
  )
}

export const ConnMenu = ({
  subWallet: { account }
}: {
  subWallet: SubEntry
}) => {
  return (
    <Box onClick={(e) => e.stopPropagation()}>
      <Menu isLazy autoSelect={false} placement="left">
        <MenuButton
          variant="link"
          minW={0}
          as={IconButton}
          icon={<Icon as={MdMoreVert} fontSize="xl" />}
        />

        <MenuList minW={32} fontSize="sm">
          <MenuItem
            icon={<Icon as={VscDebugDisconnect} />}
            iconSpacing={2}
            onClick={async () => {
              const href = (await getCurrentTab())?.url
              if (!href) return
              await CONNECTED_SITE_SERVICE.disconnectSite({ account, href })
            }}>
            Disconnect
          </MenuItem>
        </MenuList>
      </Menu>
    </Box>
  )
}
