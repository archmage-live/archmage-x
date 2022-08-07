import { Flex, Stack } from '@chakra-ui/react'
import { FaPlug } from 'react-icons/fa'
import { IoMdSettings, IoMdWallet } from 'react-icons/io'

import { MenuButton, MenuButtonProps } from './MenuButton'

const menu: MenuButtonProps[] = [
  {
    to: 'general',
    label: 'General',
    icon: IoMdSettings
  },
  {
    to: 'wallets',
    label: 'Wallets',
    icon: IoMdWallet
  },
  {
    to: 'networks',
    label: 'Networks',
    icon: FaPlug
  }
]

interface SideMenuProps {}

export const SideMenu = ({}: SideMenuProps) => {
  return (
    <Flex as="section" minH="100%">
      <Flex flex="1" maxW="2xs">
        <Stack justify="space-between" spacing="1" width="full">
          <Stack spacing="4" shouldWrapChildren>
            {menu.map((item) => (
              <Stack key={item.to} spacing="1">
                <MenuButton to={item.to} label={item.label} icon={item.icon} />
              </Stack>
            ))}
          </Stack>
        </Stack>
      </Flex>
    </Flex>
  )
}
