import { Flex, Stack } from '@chakra-ui/react'
import { FaPlug } from '@react-icons/all-files/fa/FaPlug'
import { IoMdSettings } from '@react-icons/all-files/io/IoMdSettings'
import { IoMdWallet } from '@react-icons/all-files/io/IoMdWallet'

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
