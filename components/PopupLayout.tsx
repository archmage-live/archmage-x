import { Container, Flex } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { useState } from 'react'

import { NavTarget, Navbar } from '~components/Navbar'
import { Toolbar } from '~components/Toolbar'

interface PopupLayoutProps {
  children?: ReactNode
}

export const PopupLayout = ({ children }: PopupLayoutProps) => {
  const [navTarget, setNavTarget] = useState<NavTarget>('Assets')

  return (
    <Flex
      direction="column"
      minW="360px"
      minH="600px"
      w="100vw"
      h="100vh"
      justify="space-between">
      <Toolbar />

      <Container flex="1">{children}</Container>

      <Navbar value={navTarget} onChange={setNavTarget} />
    </Flex>
  )
}
