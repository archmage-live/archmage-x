import { Box, useColorModeValue } from '@chakra-ui/react'
import { useState } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'

import { AccountDetailModal } from '~components/AccountDetailModal'
import { LazyTabs } from '~components/LazyTabs'
import { NavTarget, Navbar } from '~components/Navbar'
import { useIsPopupWindow } from '~lib/hooks/useIsPopupWindow'
import { CONSENT_SERVICE } from '~lib/services/consentService'
import ActivityPage from '~pages/Popup/Activity'
import ConsentPage from '~pages/Popup/Consent'
import { ModalBox } from '~pages/Popup/ModalBox'
import NFTsPage from '~pages/Popup/NFTs'
import { OverlayCheckUnlocked } from '~pages/Popup/Overlay'
import PortalPage from '~pages/Popup/Portal'
import SettingsPage from '~pages/Popup/Settings'
import UnlockPage from '~pages/Unlock'

import { Toolbar } from './Toolbar'

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
        <Route path="/" element={<HomePage />} />
        <Route path="/unlock" element={<UnlockPage />} />
        <Route path="/consent" element={<ConsentPage />} />
      </Routes>
    </Box>
  )
}

export const HomePage = () => {
  const [loaded, setLoaded] = useState(false)

  const [navTarget, setNavTarget] = useState<NavTarget>('Assets')

  const navigate = useNavigate()

  const [consentChecked, setConsentChecked] = useState(false)
  CONSENT_SERVICE.getRequests().then((requests) => {
    if (requests.length) {
      navigate('/consent', { replace: true })
    } else {
      setConsentChecked(true)
    }
  })

  return (
    <Box position="relative" w="full" h="full">
      {consentChecked && (
        <>
          <Toolbar />

          <Box w="full" h="calc(100% - 68px)" position="relative">
            <ModalBox />

            <Box h="calc(100% - 63px)">
              <LazyTabs index={tabIndex(navTarget)}>
                <PortalPage onLoaded={() => setLoaded(true)} />
                {/*<NFTsPage />*/}
                <ActivityPage />
                <SettingsPage />
              </LazyTabs>
            </Box>

            <Navbar value={navTarget} onChange={setNavTarget} />
          </Box>

          <AccountDetailModal />
        </>
      )}

      <OverlayCheckUnlocked isLoading={!loaded} />
    </Box>
  )
}
