import { ThemeConfig, theme as baseTheme, extendTheme } from '@chakra-ui/react'
import { StyleFunctionProps, mode } from '@chakra-ui/theme-tools'

export const theme: Record<string, any> = extendTheme(
  {
    styles: {
      global: (props: StyleFunctionProps) => ({
        body: {
          fontFamily: 'body',
          color: mode('gray.800', 'whiteAlpha.900')(props),
          bg: mode('white', 'gray.800')(props),
          lineHeight: 'base'
        },
        '*::placeholder': {
          color: mode('gray.500', 'whiteAlpha.400')(props)
        },
        '*, *::before, &::after': {
          borderColor: mode('gray.200', 'whiteAlpha.300')(props)
        }
      })
    },
    config: {
      cssVarPrefix: 'ck',
      initialColorMode: 'dark',
      useSystemColorMode: false
    } as ThemeConfig
  },
  {
    components: {
      Drawer: {
        ...baseTheme.components.Drawer,
        baseStyle: (props: StyleFunctionProps) => {
          const baseStyle = baseTheme.components.Drawer.baseStyle(props)
          return {
            ...baseStyle,
            dialog: {
              ...baseStyle.dialog,
              bg: mode('white', 'gray.800')(props)
            }
          }
        },
        sizes: {
          ...baseTheme.components.Drawer.sizes,
          '2xs': {
            dialog: { maxW: '2xs' }
          },
          '3xs': {
            dialog: { maxW: '3xs' }
          }
        },
        defaultProps: {
          size: '2xs'
        }
      },
      Modal: {
        ...baseTheme.components.Modal,
        baseStyle: (props: StyleFunctionProps) => {
          const baseStyle = baseTheme.components.Modal.baseStyle(props)
          return {
            ...baseStyle,
            dialog: {
              ...baseStyle.dialog,
              bg: mode('white', 'gray.800')(props)
            }
          }
        }
      },
      Button: {
        ...baseTheme.components.Button,
        variants: {
          ...baseTheme.components.Button.variants,
          solid: (props: StyleFunctionProps) => {
            const { colorScheme: c } = props
            if (c === 'gray') {
              return baseTheme.components.Button.variants.solid
            }

            const bg = mode(`${c}.600`, `${c}.500`)(props)
            const grayBg = mode(`gray.100`, `whiteAlpha.200`)(props)

            return {
              bg,
              color: mode('white', `gray.100`)(props),
              _hover: {
                bg: mode(`${c}.700`, `${c}.600`)(props),
                _disabled: {
                  bg: grayBg
                }
              },
              _disabled: {
                opacity: 1,
                color: mode('gray.500', `gray.400`)(props),
                bg: grayBg
              },
              _active: { bg: mode(`${c}.700`, `${c}.600`)(props) }
            }
          }
        }
      }
    }
  }
)
