import { Container, Flex } from '@chakra-ui/react'
import { atom, useAtom } from 'jotai'
import { useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'

import { NavTarget, Navbar } from '~components/Navbar'
import AssetsPage from '~pages/Popup/Assets'
import ConsentPage from '~pages/Popup/Consent'
import UnlockPage from '~pages/Unlock'

import { Toolbar } from './Toolbar'

const isPopupWindowAtom = atom<boolean>(false)

function useIsPopupWindow() {
  const location = useLocation()
  const [isPopupWindow, setIsPopupWindowAtom] = useAtom(isPopupWindowAtom)
  if (isPopupWindow) {
    return true
  }

  if (new URLSearchParams(location.search).get('popup') === 'window') {
    setIsPopupWindowAtom(true)
    return true
  }

  return false
}

export default function Popup() {
  const isPopupWindow = useIsPopupWindow()
  const [navTarget, setNavTarget] = useState<NavTarget>('Assets')

  let minW, minH
  if (!isPopupWindow) {
    minW = '360px'
    minH = '600px'
  }

  return (
    <Flex
      direction="column"
      minW={minW}
      minH={minH}
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
        <Route path="/consent" element={<ConsentPage />} />
        <Route
          path="/*"
          element={
            <>
              <Toolbar />

              <Container flex="1">
                <Routes>
                  <Route path="/home" element={<AssetsPage />} />
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
