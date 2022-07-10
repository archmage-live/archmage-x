import { ChakraProvider } from '@chakra-ui/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { PopupLayout } from '~components/PopupLayout'
import { LanguageProvider } from '~lib/i18n'
import Home from '~pages/Home'
import { theme } from '~theme'

export default function Popup() {
  return (
    <LanguageProvider>
      <ChakraProvider resetCSS theme={theme}>
        <PopupLayout>
          <MemoryRouter>
            <Routes>
              <Route path="/" element={<Home />} />
            </Routes>
          </MemoryRouter>
        </PopupLayout>
      </ChakraProvider>
    </LanguageProvider>
  )
}
