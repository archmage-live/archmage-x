import { HStack, IconButton, useColorModeValue } from '@chakra-ui/react'
import type { ReactElement } from 'react'
import { IoMdSettings, IoMdSwap } from 'react-icons/io'
import { IoFlashSharp, IoGrid } from 'react-icons/io5'
import { RiMoneyDollarCircleFill } from 'react-icons/ri'

export type NavTarget = 'Assets' | 'NFTs' | 'Swap' | 'Transactions' | 'Settings'

interface NavbarProps {
  value?: NavTarget

  onChange(value: NavTarget): void
}

export const Navbar = ({ value, onChange }: NavbarProps) => {
  const btnColor = useColorModeValue('gray.500', 'gray.600')
  const btnActiveColor = useColorModeValue('gray.900', 'gray.200')

  const Btn = ({ target, icon }: { target: NavTarget; icon: ReactElement }) => (
    <IconButton
      variant="ghost"
      colorScheme="gray"
      color={btnColor}
      _active={{ color: btnActiveColor }}
      _hover={{ color: btnActiveColor }}
      icon={icon}
      aria-label={target}
      fontSize="2rem"
      isActive={value === target}
      onClick={() => onChange(target)}
    />
  )

  return (
    <HStack
      py="4"
      px="4"
      justify="space-around"
      bg={useColorModeValue('white', 'gray.900')}
      boxShadow={useColorModeValue('lg', 'lg-dark')}>
      <Btn target="Assets" icon={<RiMoneyDollarCircleFill />} />
      <Btn target="NFTs" icon={<IoGrid />} />
      <Btn target="Swap" icon={<IoMdSwap />} />
      <Btn target="Transactions" icon={<IoFlashSharp />} />
      <Btn target="Settings" icon={<IoMdSettings />} />
    </HStack>
  )
}
