import { useColorMode } from '@chakra-ui/react'
import { useEffectOnce } from 'react-use'

export function useColorModeEffect() {
  const { setColorMode } = useColorMode()

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
