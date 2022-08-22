import { chakra } from '@chakra-ui/react'
import { ReactNode } from 'react'

export const Badge = ({ children }: { children: ReactNode }) => {
  return (
    <chakra.span
      px="5px"
      py="1px"
      display="inline-block"
      borderRadius="6px"
      borderWidth="1px"
      borderColor="purple.500"
      color="purple.500"
      transform="scale(0.6)"
      transformOrigin="left"
      textTransform="uppercase"
      whiteSpace="nowrap"
      verticalAlign="super">
      {children}
    </chakra.span>
  )
}
