import { Box, Container, useColorModeValue } from '@chakra-ui/react'
import { atom, useAtom } from 'jotai'
import { useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

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
          path="/*"
          element={
            <>
              <Toolbar />

              <Container maxH="469px" overflowY="auto">
                <Routes>
                  <Route path="*" element={<Navigate to="Assets" replace />} />
                  <Route path="/Assets" element={<AssetsPage />} />
                  <Route path="/NFTs" element={<NFTsPage />} />
                  <Route path="/Activity" element={<ActivityPage />} />
                  <Route path="/Settings" element={<SettingsPage />} />
                </Routes>
              </Container>

              <Navbar value={navTarget} onChange={setNavTarget} />
            </>
          }
        />
      </Routes>
    </Box>
  )
}
