import { Box, BoxProps, useColorModeValue } from '@chakra-ui/react'

export const Card = (props: BoxProps) => (
  <Box
    p="4"
    bg={useColorModeValue('white', 'gray.900')}
    boxShadow={useColorModeValue('lg', 'dark-lg')}
    borderRadius="lg"
    {...props}
  />
)
