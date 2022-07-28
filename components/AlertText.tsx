import { Text, useColorModeValue, useToken } from '@chakra-ui/react'
import { TinyColor } from '@ctrl/tinycolor'
import { ReactNode } from 'react'

interface AlertTextProps {
  children: ReactNode
}

export const AlertText = ({ children }: AlertTextProps) => {
  const bg = useTransparentize('orange.300', 'orange.300', 0.1)
  return children ? (
    <Text
      py="2"
      px="4"
      borderRadius="4px"
      border="1px solid"
      borderColor="orange.500"
      bg={bg}>
      {children}
    </Text>
  ) : (
    <></>
  )
}

function useTransparentize(
  colorLight: string,
  colorDark: string,
  opacity: number
) {
  ;[colorLight, colorDark] = useToken('colors', [colorLight, colorDark])
  return useColorModeValue(
    new TinyColor(colorLight).setAlpha(opacity).toRgbString(),
    new TinyColor(colorDark).setAlpha(opacity).toRgbString()
  )
}
