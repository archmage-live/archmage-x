import { Center, Stack, Text, useColorModeValue } from '@chakra-ui/react'
import { ReactNode } from 'react'
import HashLoader from 'react-spinners/HashLoader'

import { useColor } from '~hooks/useColor'
import { useCheckUnlocked } from '~lib/password'

interface OverlayProps {
  isLoading?: boolean
  subtitle?: ReactNode
  children?: ReactNode
}

export const Overlay = ({ isLoading, subtitle, children }: OverlayProps) => {
  const spinnerColor = useColor('purple.500', 'purple.500')

  return (
    <Stack
      p="4"
      pt="40"
      spacing="12"
      position="absolute"
      top={0}
      bottom={0}
      left={0}
      right={0}
      zIndex={9999}
      bg={useColorModeValue('purple.50', 'gray.800')}>
      <Stack align="center">
        <Text fontSize="4xl" fontWeight="bold">
          Archmage X
        </Text>

        {subtitle}
      </Stack>

      {isLoading && (
        <Center>
          <HashLoader color={spinnerColor.toHexString()} speedMultiplier={3} />
        </Center>
      )}

      {children}
    </Stack>
  )
}

export const OverlayCheckUnlocked = ({ isLoading }: OverlayProps) => {
  useCheckUnlocked()

  if (isLoading === false) {
    return <></>
  }

  return <Overlay isLoading={isLoading} />
}
