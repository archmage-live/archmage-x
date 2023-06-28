import { ThemeConfig, theme as baseTheme, extendTheme } from '@chakra-ui/react'
import {
  StyleFunctionProps,
  mode,
  transparentize
} from '@chakra-ui/theme-tools'

export const theme: Record<string, any> = extendTheme(
  {
    styles: {
      global: (props: StyleFunctionProps) => ({
        html: {
          fontSize: '14px'
        },
        body: {
          fontFamily: 'body',
          color: mode('gray.800', 'whiteAlpha.900')(props),
          bg: mode('purple.50', 'gray.800')(props),
          lineHeight: 'base'
        },
        '*::placeholder': {
          color: mode('gray.500', 'whiteAlpha.400')(props)
        },
        '*, *::before, &::after': {
          borderColor: mode('gray.200', 'whiteAlpha.300')(props)
        },
        '*::-webkit-scrollbar': {
          display: 'none'
        },
        '*': {
          msOverflowStyle: 'none',
          scrollbarWidth: 'none'
        },
        '--toast-z-index': 1300,
        // TODO: Remove this once --toast-z-index takes effect
        // https://github.com/chakra-ui/chakra-ui/issues/7505
        'div[id^="chakra-toast"]': {
          zIndex: `1300 !important`
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
          const baseStyle = baseTheme.components.Drawer.baseStyle?.(props)
          return {
            ...baseStyle,
            dialog: {
              ...baseStyle?.dialog,
              bg: mode('white', 'gray.800')(props)
            }
          }
        },
        sizes: {
          ...baseTheme.components.Drawer.sizes,
          xs: {
            dialog: { maxW: '21rem' }
          },
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
          const baseStyle = baseTheme.components.Modal.baseStyle?.(props)
          return {
            ...baseStyle,
            dialog: {
              ...baseStyle?.dialog,
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
              return baseTheme.components.Button.variants?.solid
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
          },
          'solid-secondary': (props: StyleFunctionProps) => {
            const { colorScheme: c } = props
            if (c === 'gray') {
              const bg = mode(`gray.50`, `whiteAlpha.50`)(props)

              return {
                bg,
                _hover: {
                  bg: mode(`gray.100`, `whiteAlpha.200`)(props),
                  _disabled: {
                    bg
                  }
                },
                _active: { bg: mode(`gray.100`, `whiteAlpha.200`)(props) }
              }
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
          },
          ghost: (props: StyleFunctionProps) => {
            const { colorScheme: c, theme } = props

            if (c === 'gray') {
              return {
                color: mode(`inherit`, `whiteAlpha.900`)(props),
                _hover: {
                  bg: mode(`gray.100`, `whiteAlpha.200`)(props)
                },
                _active: { bg: mode(`gray.200`, `whiteAlpha.300`)(props) }
              }
            }

            const darkHoverBg = transparentize(`${c}.100`, 0.06)(theme)
            const darkActiveBg = transparentize(`${c}.100`, 0.12)(theme)

            return {
              color: mode(`${c}.600`, `${c}.200`)(props),
              bg: 'transparent',
              _hover: {
                bg: mode(`${c}.50`, darkHoverBg)(props)
              },
              _active: {
                bg: mode(`${c}.100`, darkActiveBg)(props)
              }
            }
          },
          'ghost-secondary': (props: StyleFunctionProps) => {
            const { colorScheme: c, theme } = props

            if (c === 'gray') {
              return {
                color: mode(`inherit`, `whiteAlpha.900`)(props),
                _hover: {
                  bg: mode(`gray.50`, `whiteAlpha.50`)(props)
                },
                _active: { bg: mode(`gray.100`, `whiteAlpha.100`)(props) }
              }
            }

            const darkHoverBg = transparentize(`${c}.50`, 0.06)(theme)
            const darkActiveBg = transparentize(`${c}.50`, 0.12)(theme)

            return {
              color: mode(`${c}.600`, `${c}.200`)(props),
              bg: 'transparent',
              _hover: {
                bg: mode(`${c}.50`, darkHoverBg)(props)
              },
              _active: {
                bg: mode(`${c}.50`, darkActiveBg)(props)
              }
            }
          }
        }
      }
    }
  }
)
