import { Center } from '@chakra-ui/react'
import { ReactNode } from 'react'

interface CenterLayoutProps {
  children?: ReactNode
}

export const CenterLayout = ({ children }: CenterLayoutProps) => {
  return (
    <Center w="100vw" h="100vh">
      {children}
    </Center>
  )
}
