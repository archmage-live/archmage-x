import { localStorageManager, useColorMode } from '@chakra-ui/react'
import { useEffectOnce } from 'react-use'

export function useColorModeEffect() {
  const { setColorMode } = useColorMode()

  // Listen for color mode changes from other tabs
  useEffectOnce(() => {
    const listener = () => {
      const colorMode = window.localStorage.getItem('chakra-ui-color-mode')
      if (colorMode) {
        setColorMode(colorMode)
      }
    }

    window.addEventListener('storage', listener)

    return () => {
      window.removeEventListener('storage', listener)
    }
  })
}

export const colorModeManager: typeof localStorageManager = {
  ...localStorageManager,
  // deceive Chakra into thinking it is using Cookies and SSR,
  // to fix the color mode flash issue
  ssr: true,
  type: 'cookie'
}
