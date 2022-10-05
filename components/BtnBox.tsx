import { Box, BoxProps, forwardRef, useColorModeValue } from '@chakra-ui/react'

export const BtnBox = forwardRef<BoxProps, 'div'>(
  ({ children, ...props }, ref) => (
    <Box
      ref={ref}
      cursor="pointer"
      color={useColorModeValue('gray.500', 'gray.200')}
      _active={{ color: useColorModeValue('gray.700', 'gray.500') }}
      {...props}>
      {children}
    </Box>
  )
)
