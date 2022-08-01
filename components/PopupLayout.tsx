import { Container, Flex } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { useState } from 'react'

import { NavTarget, Navbar } from '~components/Navbar'
import { Toolbar } from '~components/Toolbar'

interface PopupLayoutProps {
  vanilla?: boolean
  children?: ReactNode
}

export const PopupLayout = ({ vanilla, children }: PopupLayoutProps) => {
  const [navTarget, setNavTarget] = useState<NavTarget>('Assets')

  return (
    <Flex
      direction="column"
      minW="360px"
      minH="600px"
      w="100vw"
      h="100vh"
      justify="space-between">
      {!vanilla && <Toolbar />}

      <Container flex="1">{children}</Container>

      {!vanilla && <Navbar value={navTarget} onChange={setNavTarget} />}
    </Flex>
  )
}
