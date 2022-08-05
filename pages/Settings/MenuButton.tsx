import {
  As,
  Button,
  ButtonProps,
  HStack,
  Icon,
  Text,
  useColorModeValue
} from '@chakra-ui/react'
import React from 'react'
import { NavLink } from 'react-router-dom'

export interface MenuButtonProps extends ButtonProps {
  to: string
  icon: As
  label: string
}

export const MenuButton = (props: MenuButtonProps) => {
  const { to, icon, label, ...buttonProps } = props

  const bg = useColorModeValue('whiteAlpha.100', 'gray.100')

  return (
    <NavLink to={to}>
      {({ isActive }) => (
        <Button
          w="full"
          as="div"
          variant="ghost"
          justifyContent="start"
          colorScheme="purple"
          isActive={isActive}
          {...buttonProps}>
          <HStack spacing="3">
            <Icon as={icon} boxSize="6" color="purple.500" />
            <Text color="purple.500">{label}</Text>
          </HStack>
        </Button>
      )}
    </NavLink>
  )
}
