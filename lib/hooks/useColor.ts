import { useColorModeValue, useToken } from '@chakra-ui/react'
import { TinyColor } from '@ctrl/tinycolor'
import { useMemo } from 'react'

export function useColor(colorLight: string, colorDark: string): TinyColor {
  ;[colorLight, colorDark] = useToken('colors', [colorLight, colorDark])
  const [light, dark] = useMemo(() => {
    return [new TinyColor(colorLight), new TinyColor(colorDark)]
  }, [colorLight, colorDark])
  return useColorModeValue(light, dark)
}

export function useTransparentize(
  colorLight: string,
  colorDark: string,
  opacity?: number
) {
  if (opacity === undefined) {
    opacity = 1
  }
  return useColor(colorLight, colorDark).setAlpha(opacity).toRgbString()
}
