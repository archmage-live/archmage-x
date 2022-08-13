import { Container, Flex } from '@chakra-ui/react'
import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'

import { NavTarget, Navbar } from '~components/Navbar'
import PopupHomePage from '~pages/PopupHome'
import UnlockPage from '~pages/Unlock'

import { Toolbar } from './Toolbar'

export default function Popup() {
  const [navTarget, setNavTarget] = useState<NavTarget>('Assets')

  return (
    <Flex
      direction="column"
      minW="360px"
      minH="600px"
      w="100vw"
      h="100vh"
      justify="space-between">
      <Routes>
        <Route
          path="/"
          element={
            <Container flex="1">
              <UnlockPage />
            </Container>
          }
        />
        <Route
          path="/*"
          element={
            <>
              <Toolbar />

              <Container flex="1">
                <Routes>
                  <Route path="/home" element={<PopupHomePage />} />
                </Routes>
              </Container>

              <Navbar value={navTarget} onChange={setNavTarget} />
            </>
          }
        />
      </Routes>
    </Flex>
  )
}
