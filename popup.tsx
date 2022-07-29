import { ChakraProvider } from '@chakra-ui/react'
import { HashRouter, Route, Routes } from 'react-router-dom'

import { PopupLayout } from '~components/PopupLayout'
import { LanguageProvider } from '~lib/i18n'
import { SERVICE_WORKER_CLIENT } from '~lib/rpc'
import AddWalletPage from '~pages/AddWallet'
import PopupHomePage from '~pages/PopupHome'
import WelcomePage from '~pages/Welcome'
import { theme } from '~theme'

// If you are working on some UI detail adjustment, you may comment out
// the following line. Otherwise, the message connection reestablishment
// after live-reloading will automatically close the extension tab page,
// which is quite annoying.
// SERVICE_WORKER_CLIENT.connect()

export default function Popup() {
  return (
    <LanguageProvider>
      <ChakraProvider resetCSS theme={theme}>
        <HashRouter>
          <Routes>
            <Route
              path="/*"
              element={
                <PopupLayout>
                  <Routes>
                    <Route path="/" element={<PopupHomePage />} />
                  </Routes>
                </PopupLayout>
              }
            />
            <Route
              path="/tab/*"
              element={
                <Routes>
                  <Route path="/welcome" element={<WelcomePage />} />
                  <Route path="/add-wallet" element={<AddWalletPage />} />
                </Routes>
              }
            />
          </Routes>
        </HashRouter>
      </ChakraProvider>
    </LanguageProvider>
  )
}
