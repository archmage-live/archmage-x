import { Box, Container, useColorModeValue } from '@chakra-ui/react'
import { atom, useAtom } from 'jotai'
import { useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'

import { LazyTabs } from '~components/LazyTabs'
import { NavTarget, Navbar } from '~components/Navbar'
import ActivityPage from '~pages/Popup/Activity'
import AssetsPage from '~pages/Popup/Assets'
import ConsentPage from '~pages/Popup/Consent'
import NFTsPage from '~pages/Popup/NFTs'
import SettingsPage from '~pages/Popup/Settings'
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

function tabIndex(navTarget: NavTarget) {
  switch (navTarget) {
    case 'Assets':
      return 0
    case 'Activity':
      return 1
    case 'Settings':
      return 2
  }
  return 0
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
    <Box
      minW={minW}
      minH={minH}
      w="100vw"
      h="100vh"
      bg={useColorModeValue('white', 'gray.800')}
      position="relative">
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
          path="/home"
          element={
            <>
              <Toolbar />

              <Box h="469px">
                <LazyTabs index={tabIndex(navTarget)}>
                  <AssetsPage />
                  {/*<NFTsPage />*/}
                  <ActivityPage />
                  <SettingsPage />
                </LazyTabs>
              </Box>

              <Navbar value={navTarget} onChange={setNavTarget} />
            </>
          }
        />
      </Routes>
    </Box>
  )
}
